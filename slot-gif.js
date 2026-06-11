// ── 슬롯 릴 GIF 렌더러 ───────────────────────────────────────────
// 3릴이 빠르게 돌다 왼쪽부터 하나씩 감속·탄성 정지(easeOutBack 오버슈트).
// 회전 중 잔상(고스트) 모션 블러 + 스피드 라인, 당첨 시 코인 파티클 + 글로우.
// loop:1 — 1회 재생 후 마지막 프레임 정지.
const fruit = require("./fruit-symbols");
const slot = require("./slot");
const { framesToGif, easeOutBack, seededRand } = require("./utils");

const CELL = 110, GAP = 14, PAD = 22, HEADER = 58;
const W = 3 * CELL + 2 * GAP + PAD * 2;
const H = HEADER + CELL + PAD + 26;
const REEL_Y = HEADER;
const ALL = slot.SYMBOLS.map((s) => s.e);

function reelStrip(finalSym, len, seed) {
  // 위에서 아래로 지나갈 심볼들. len-1 번째가 final, 그 뒤 2칸은 오버슈트 때 보이는 여분.
  const arr = [];
  for (let i = 0; i < len - 1; i++) arr.push(ALL[(seed * 7 + i * 3) % ALL.length]);
  arr.push(finalSym);
  arr.push(ALL[(seed * 5 + 1) % ALL.length]);
  arr.push(ALL[(seed * 11 + 4) % ALL.length]);
  return arr;
}

function shell(body, head, headColor, flash = 0, over = "") {
  const fl = flash > 0 ? `<rect width="${W}" height="${H}" rx="22" fill="#fff" opacity="${flash}"/>` : "";
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.4" r="0.9"><stop offset="0" stop-color="#2a1a55"/><stop offset="1" stop-color="#140a2e"/></radialGradient>
    <clipPath id="win"><rect x="${PAD - 4}" y="${REEL_Y - 4}" width="${3 * CELL + 2 * GAP + 8}" height="${CELL + 8}" rx="14"/></clipPath></defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    <text x="${W / 2}" y="38" font-size="26" font-weight="bold" fill="${headColor}" text-anchor="middle" font-family="DejaVu Sans">${head}</text>
    <rect x="${PAD - 8}" y="${REEL_Y - 8}" width="${3 * CELL + 2 * GAP + 16}" height="${CELL + 16}" rx="16" fill="#3b2a6b" stroke="#ffd770" stroke-width="2" opacity="0.9"/>
    <g clip-path="url(#win)">${body}</g>
    ${over}${fl}
  </svg>`;
}

// speed: 셀/프레임. 빠를수록 잔상 길고 본체가 흐려짐.
function reelCol(i, strip, offset, speed) {
  const x = PAD + i * (CELL + GAP);
  let s = `<rect x="${x}" y="${REEL_Y}" width="${CELL}" height="${CELL}" rx="12" fill="#1c1430"/>`;
  const fast = speed > 0.3;
  // [세로 오프셋(셀), 불투명도] — 잔상 2개 + 본체
  const layers = fast
    ? [[-speed * 0.55, 0.22], [speed * 0.55, 0.22], [0, 0.7]]
    : [[0, 1]];
  for (const [go, alpha] of layers) {
    for (let k = 0; k < strip.length; k++) {
      const y = REEL_Y + (k - offset + go) * (CELL + 6);
      if (y < REEL_Y - CELL || y > REEL_Y + CELL) continue;
      s += fruit.symbol(strip[k], x, y, CELL, 1, alpha);
    }
  }
  // 스피드 라인
  if (fast) {
    const op = Math.min(0.3, 0.08 + speed * 0.08);
    for (let l = 0; l < 3; l++)
      s += `<rect x="${x + 16 + l * 34}" y="${REEL_Y + 8}" width="3" height="${CELL - 16}" rx="1.5" fill="#fff" opacity="${op.toFixed(2)}"/>`;
  }
  return s;
}

// 당첨 코인 파티클 (중앙에서 분수처럼 퍼짐, 시드 고정 → 프레임 간 일관)
function coinBurst(t, seed) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, sp = 90 + rnd() * 140;
    const x = W / 2 + Math.cos(a) * sp * t;
    const y = REEL_Y + CELL / 2 + Math.sin(a) * sp * t + 150 * t * t;
    const r = 4 + rnd() * 4;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${i % 3 ? "#ffd770" : "#fff3c4"}" stroke="#8a6a1a" stroke-width="1" opacity="${(1 - t * 0.6).toFixed(2)}"/>`;
  }
  return s;
}
// 당첨 라인 글로우 펄스
function winGlow(t) {
  return `<rect x="${PAD - 8}" y="${REEL_Y - 8}" width="${3 * CELL + 2 * GAP + 16}" height="${CELL + 16}" rx="16" fill="none" stroke="#ffd770" stroke-width="${(3 + 3 * Math.sin(t * Math.PI)).toFixed(1)}" opacity="${(0.5 + 0.5 * Math.sin(t * Math.PI)).toFixed(2)}"/>`;
}

async function render(finalReels, result, bet) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  const STRIPLEN = 14;
  const FINAL = STRIPLEN - 1;
  const strips = finalReels.map((f, i) => reelStrip(f, STRIPLEN, i + 2));
  // 릴별 정지 시점(프레임): 왼쪽부터 시차
  const TOTAL_F = 34;
  const stopAt = [16, 24, 32];
  const offAt = (i, f) => {
    const sf = stopAt[i];
    if (f >= sf) return FINAL;
    // easeOutBack: 마지막 칸을 살짝 지나쳤다가 되돌아오는 탄성 정지
    return Math.max(0, easeOutBack(f / sf, 1.2)) * FINAL;
  };
  for (let f = 1; f <= TOTAL_F; f++) {
    let body = "";
    for (let i = 0; i < 3; i++) {
      const off = offAt(i, f);
      const speed = Math.abs(off - offAt(i, f - 1));
      body += reelCol(i, strips[i], off, speed);
    }
    const justStopped = stopAt.includes(f);
    add(shell(body, "SPIN", "#cbd5e1", justStopped ? 0.18 : 0), f < stopAt[0] ? 40 : 55);
  }
  // 결과 강조
  let final = "";
  for (let i = 0; i < 3; i++) final += reelCol(i, strips[i], FINAL, 0);
  if (result.mult > 0) {
    const FW = result.jackpot ? 8 : 6;
    for (let f = 0; f < FW; f++) {
      const t = (f + 1) / FW;
      add(shell(final, result.jackpot ? "JACKPOT!!" : "WIN!", "#ffd770", f === 0 ? 0.45 : 0, coinBurst(t, result.jackpot ? 77 : 7) + winGlow(t)), 90);
    }
  }
  const head = result.mult > 0 ? `WIN  +${(bet * result.mult).toLocaleString()}` : "꽝";
  add(shell(final, head, result.mult > 0 ? "#9bf0c0" : "#aab", 0, result.mult > 0 ? winGlow(0.5) : ""), 2000);

  return framesToGif(frames, delays, W, H);
}

module.exports = { render };
