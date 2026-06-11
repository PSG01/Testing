// ── 슬롯 릴 GIF 렌더러 ───────────────────────────────────────────
// 3릴이 빠르게 돌다 왼쪽부터 하나씩 감속·정지(바운스). 당첨 시 라인 강조, 잭팟 번쩍.
// loop:1 — 1회 재생 후 마지막 프레임 정지.
const sharp = require("sharp");
const fruit = require("./fruit-symbols");
const slot = require("./slot");

const CELL = 110, GAP = 14, PAD = 22, HEADER = 58;
const W = 3 * CELL + 2 * GAP + PAD * 2;
const H = HEADER + CELL + PAD + 26;
const REEL_Y = HEADER;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const ALL = slot.SYMBOLS.map((s) => s.e);

function reelStrip(finalSym, len, seed) {
  // 위에서 아래로 지나갈 심볼들. 마지막이 final.
  const arr = [];
  for (let i = 0; i < len - 1; i++) arr.push(ALL[(seed * 7 + i * 3) % ALL.length]);
  arr.push(finalSym);
  return arr;
}

function shell(body, head, headColor, flash = 0) {
  const fl = flash > 0 ? `<rect width="${W}" height="${H}" rx="22" fill="#fff" opacity="${flash}"/>` : "";
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.4" r="0.9"><stop offset="0" stop-color="#2a1a55"/><stop offset="1" stop-color="#140a2e"/></radialGradient>
    <clipPath id="win"><rect x="${PAD - 4}" y="${REEL_Y - 4}" width="${3 * CELL + 2 * GAP + 8}" height="${CELL + 8}" rx="14"/></clipPath></defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    <text x="${W / 2}" y="38" font-size="26" font-weight="bold" fill="${headColor}" text-anchor="middle" font-family="DejaVu Sans">${head}</text>
    <rect x="${PAD - 8}" y="${REEL_Y - 8}" width="${3 * CELL + 2 * GAP + 16}" height="${CELL + 16}" rx="16" fill="#3b2a6b" stroke="#ffd770" stroke-width="2" opacity="0.9"/>
    <g clip-path="url(#win)">${body}</g>
  </svg>`;
}

function reelCol(i, strip, offset, blur) {
  // offset: 0(시작, 스트립 맨 위) → strip.length-1(마지막=final 이 창에 옴)
  const x = PAD + i * (CELL + GAP);
  let s = `<rect x="${x}" y="${REEL_Y}" width="${CELL}" height="${CELL}" rx="12" fill="#1c1430"/>`;
  for (let k = 0; k < strip.length; k++) {
    const y = REEL_Y + (k - offset) * (CELL + 6);
    if (y < REEL_Y - CELL || y > REEL_Y + CELL) continue;
    s += fruit.symbol(strip[k], x, y, CELL, 1, blur ? 0.55 : 1);
  }
  return s;
}

async function render(finalReels, result, bet) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  const STRIPLEN = 14;
  const strips = finalReels.map((f, i) => reelStrip(f, STRIPLEN, i + 2));
  // 릴별 정지 시점(프레임): 왼쪽부터 시차
  const TOTAL_F = 34;
  const stopAt = [16, 24, 32];
  for (let f = 1; f <= TOTAL_F; f++) {
    let body = "";
    for (let i = 0; i < 3; i++) {
      const sf = stopAt[i];
      let off, blur;
      if (f >= sf) { off = STRIPLEN - 1; blur = false; }
      else {
        const t = f / sf;
        off = easeOutCubic(t) * (STRIPLEN - 1);
        blur = t < 0.85;
      }
      body += reelCol(i, strips[i], off, blur);
    }
    const justStopped = stopAt.includes(f);
    add(shell(body, "SPIN", "#cbd5e1", justStopped ? 0.18 : 0), f < stopAt[0] ? 40 : 55);
  }
  // 결과 강조
  let final = "";
  for (let i = 0; i < 3; i++) final += reelCol(i, strips[i], STRIPLEN - 1, false);
  if (result.mult > 0) {
    for (let f = 0; f < 3; f++) add(shell(final, result.jackpot ? "JACKPOT!!" : "WIN!", "#ffd770", f % 2 ? 0.5 : 0.1), 120);
  }
  const head = result.mult > 0 ? `WIN  +${(bet * result.mult).toLocaleString()}` : "꽝";
  add(shell(final, head, result.mult > 0 ? "#9bf0c0" : "#aab", 0), 2000);

  const pngs = [];
  for (const svg of frames) pngs.push(await sharp(Buffer.from(svg)).png().toBuffer());
  const gif = await sharp(pngs, { join: { across: 1, animated: true } }).gif({ loop: 1, delay: delays }).toBuffer();
  const finalPng = pngs[pngs.length - 1];
  const durationMs = delays.reduce((a, b) => a + b, 0);
  return { gif, finalPng, durationMs };
}

module.exports = { render };
