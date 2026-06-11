// ── 연쇄 + 스캐터 섞임 + 착지 강조 GIF ────────────────────────────
const fruit = require("./fruit-symbols");
const { framesToGif } = require("./utils");

const COLS = 5, ROWS = 5, CELL = 72, GAP = 8, PAD = 18, HEADER = 60;
const GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
const W = GRID_W + PAD * 2, H = HEADER + GRID_H + PAD, GRID_TOP = HEADER;
const SCATTER = "🎆";

const T = {
  bg0: "#2a1a55", bg1: "#140a2e", panel: "#3b2a6b", head: "#ffd770",
  sym: { "🟦": { color: "#4f7cff", hi: "#a9c2ff" }, "🟩": { color: "#3ad07a", hi: "#9bf0c0" }, "🟪": { color: "#b06bff", hi: "#e0c2ff" }, "🟧": { color: "#ff9d3a", hi: "#ffd29b" }, "🟥": { color: "#ff5470", hi: "#ffb3c0" }, "💎": { color: "#36e6ff", hi: "#b3f6ff" }, "🎆": { color: "#ffd23a", hi: "#fff0a8" } },
};
const cx = (c) => PAD + c * (CELL + GAP);
const cyR = (r) => GRID_TOP + r * (CELL + GAP);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const kindOf = (e) => (e === "💎" ? "diamond" : e === SCATTER ? "star" : "rect");

// key = 이모지 키(🟦🟩🟪🟧🟥💎🎆). 과일 심볼로 그림.
function blockAt(x, y, s, key, scale = 1, alpha = 1) {
  return fruit.symbol(key, x, y, s, scale, alpha);
}
function starP(mx, my, R, fill, stroke, alpha = 1, sw = 2.5) {
  const p = []; for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? R * 0.45 : R; p.push(`${(mx + rad * Math.cos(a)).toFixed(1)},${(my + rad * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${alpha}"/>`;
}
function rays(mx, my, R, n, len, alpha) { let s = ""; for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; s += `<line x1="${(mx + R * Math.cos(a)).toFixed(1)}" y1="${(my + R * Math.sin(a)).toFixed(1)}" x2="${(mx + (R + len) * Math.cos(a)).toFixed(1)}" y2="${(my + (R + len) * Math.sin(a)).toFixed(1)}" stroke="#ffe98a" stroke-width="4" stroke-linecap="round" opacity="${alpha}"/>`; } return s; }
function scatterGlow(c, r, t) { const mx = cx(c) + CELL / 2, my = cyR(r) + CELL / 2, pulse = 1 + 0.1 * Math.sin(t * 6.28); return `<circle cx="${mx}" cy="${my}" r="${CELL / 2 + 5}" fill="#ffd23a" opacity="0.25"/>${rays(mx, my, CELL / 2, 8, 10, 0.7)}${starP(mx, my, (CELL / 2 - 5) * pulse, "#ffd23a", "#fff0a8", 1, 3)}`; }
function particles(mx, my, R, n, seed) { let s = ""; for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n + seed; const d = R * (0.7 + (i % 3) * 0.18); s += `<circle cx="${(mx + d * Math.cos(a)).toFixed(1)}" cy="${(my + d * Math.sin(a)).toFixed(1)}" r="${(R / 6).toFixed(1)}" fill="#fff2a8" opacity="0.9"/>`; } return s; }

function scatterBadge(n) {
  if (!n) return "";
  const bx = W - 64, by = 16;
  // 작은 금별 + 개수 (우상단 배지)
  let pts = [];
  for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? 6.5 : 14; pts.push(`${(bx + 16 + rad * Math.cos(a)).toFixed(1)},${(by + 16 + rad * Math.sin(a)).toFixed(1)}`); }
  return `<rect x="${bx - 8}" y="${by}" width="64" height="32" rx="16" fill="#000" opacity="0.35"/>
    <polygon points="${pts.join(" ")}" fill="#ffd23a" stroke="#ff9d2e" stroke-width="1.5"/>
    <text x="${bx + 38}" y="${by + 23}" font-size="19" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">${n}</text>`;
}

function shell(body, head, dx = 0, dy = 0, flash = 0, scatterN = 0) {
  const fl = flash > 0 ? `<rect width="${W}" height="${H}" rx="22" fill="#fff" opacity="${flash}"/>` : "";
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.bg0}"/><stop offset="1" stop-color="${T.bg1}"/></linearGradient><clipPath id="g"><rect x="${PAD - 2}" y="${GRID_TOP - 2}" width="${GRID_W + 4}" height="${GRID_H + 4}" rx="10"/></clipPath></defs><rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/><rect x="${PAD - 6}" y="${GRID_TOP - 6}" width="${GRID_W + 12}" height="${GRID_H + 12}" rx="16" fill="${T.panel}" opacity="0.55"/><text x="${W / 2}" y="40" font-size="25" font-weight="bold" fill="${head.color || T.head}" text-anchor="middle" font-family="DejaVu Sans">${head.text}</text>${scatterBadge(scatterN)}<g clip-path="url(#g)" transform="translate(${dx},${dy})">${body}</g>${fl}</svg>`;
}
function gridBody(grid, skip, glowScatters) {
  let s = "";
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (skip && skip.has(`${r},${c}`)) continue;
    const e = grid[r][c], st = T.sym[e]; if (!st) continue;
    s += blockAt(cx(c), cyR(r), CELL, e);
    if (glowScatters && e === SCATTER) s += scatterGlow(c, r, 0.5);
  }
  return s;
}
function fallMoves(before, after, marked) {
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    const surv = []; let k = 0;
    for (let r = 0; r < ROWS; r++) (marked.has(`${r},${c}`) ? k++ : surv.push(r));
    for (let j = 0; j < surv.length; j++) moves.push({ c, startR: surv[j], finalR: k + j, e: after[k + j][c] });
    for (let r = 0; r < k; r++) moves.push({ c, startR: r - k - 0.5, finalR: r, e: after[r][c] });
  }
  return moves;
}

function build(play, speed = 1) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(Math.round(ms * speed)); };
  let scatterCount = 0;

  // 인트로 낙하 (첫 그리드)
  const first = play.steps[0].grid;
  const firstScatters = play.steps[0].newScatters || [];
  scatterCount += firstScatters.length;
  for (let f = 1; f <= 8; f++) {
    const e = easeOutCubic(f / 8); let body = "";
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const st = T.sym[first[r][c]]; const sR = -ROWS - 1, cur = sR + (r - sR) * e; body += blockAt(cx(c), cyR(cur), CELL, first[r][c]); }
    add(shell(body, { text: "SPIN", color: "#cbd5e1" }, 0, 0, 0, scatterCount), 55);
  }
  // 첫 스캐터 강조
  if (firstScatters.length) { add(shell(gridBody(first, null, true), { text: "SCATTER!", color: "#ffd770" }, 0, 0, 0.4, scatterCount), 80); add(shell(gridBody(first, null, true), { text: "SCATTER!", color: "#ffd770" }, 0, 0, 0, scatterCount), 260); }
  else add(shell(gridBody(first), { text: "SPIN", color: "#cbd5e1" }), 240);

  let running = 0;
  for (let i = 1; i < play.steps.length; i++) {
    const s = play.steps[i];
    if (s.phase !== "pop") continue;
    running += s.stepWin;
    const after = play.steps[i + 1] ? play.steps[i + 1].grid : s.grid;
    const newSc = (play.steps[i + 1] && play.steps[i + 1].newScatters) || [];
    const head = { text: `CHAIN ${s.chain}  x${s.mult}  +${s.stepWin}`, color: "#fff2a8" };

    // 폭발
    for (let f = 1; f <= 3; f++) {
      const t = f / 3; let body = gridBody(s.grid, s.marked, true);
      for (const kk of s.marked) { const [r, c] = kk.split(",").map(Number); body += blockAt(cx(c), cyR(r), CELL, s.grid[r][c], 1 + 0.3 * t, 1 - t * 0.35); body += particles(cx(c) + CELL / 2, cyR(r) + CELL / 2, CELL / 2 * (0.6 + t), Math.round(10 * t), r + c); }
      add(shell(body, head, Math.round((Math.random() - 0.5) * 6), 0, 0, scatterCount), 70);
    }
    // 텀블 낙하
    const moves = fallMoves(s.grid, after, s.marked);
    const newScSet = new Set(newSc.map(([r, c]) => `${r},${c}`));
    for (let f = 1; f <= 9; f++) {
      const e = easeOutCubic(f / 9); let body = "";
      for (const mv of moves) { const cur = mv.startR + (mv.finalR - mv.startR) * e; body += blockAt(cx(mv.c), cyR(cur), CELL, mv.e); }
      add(shell(body, head, 0, 0, 0, scatterCount), 55);
    }
    // 새 스캐터 착지 "빰!"
    if (newSc.length) {
      scatterCount += newSc.length;
      add(shell(gridBody(after, null, true), { text: "SCATTER +1!", color: "#ffd770" }, Math.round((Math.random() - 0.5) * 8), 0, 0.55, scatterCount), 80);
      for (let f = 0; f < 3; f++) add(shell(gridBody(after, null, true), { text: "SCATTER +1!", color: "#ffd770" }, 0, 0, 0, scatterCount), 160);
    } else {
      add(shell(gridBody(after, null, true), { text: `WIN ${running}`, color: "#9bf0c0" }, 0, 0, 0, scatterCount), 150);
    }
  }

  // 마무리 / 프리스핀 트리거
  const last = play.steps[play.steps.length - 1].grid;
  if (play.freeSpins > 0) {
    for (let f = 0; f < 3; f++) add(shell(gridBody(last, null, true), { text: " " }, (Math.random() - 0.5) * 10, 0, f % 2 ? 0.7 : 0.2, scatterCount), 80);
    for (let f = 1; f <= 6; f++) {
      const sc = 0.5 + 0.5 * easeOutCubic(f / 6);
      add(shell(gridBody(last, null, true) + `<text x="${W / 2}" y="${H / 2}" font-size="${42 * sc}" font-weight="bold" fill="#fff" stroke="#7a3cff" stroke-width="2" text-anchor="middle" font-family="DejaVu Sans">FREE SPINS!</text><text x="${W / 2}" y="${H / 2 + 42}" font-size="${24 * sc}" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">${play.freeSpins} SPINS · ${play.scatters} SCATTER</text>`, { text: " " }), 120);
    }
    add(shell(gridBody(last, null, true) + `<text x="${W / 2}" y="${H / 2}" font-size="42" font-weight="bold" fill="#fff" stroke="#7a3cff" stroke-width="2" text-anchor="middle" font-family="DejaVu Sans">FREE SPINS!</text><text x="${W / 2}" y="${H / 2 + 42}" font-size="24" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">${play.freeSpins} SPINS · ${play.scatters} SCATTER</text>`, { text: " " }), 1900);
  } else {
    add(shell(gridBody(last, null, true), { text: `TOTAL ${running}`, color: "#9bf0c0" }, 0, 0, 0, scatterCount), 1700);
  }
  return { frames, delays };
}

async function render(play, speed = 1) {
  const { frames, delays } = build(play, speed);
  const out = await framesToGif(frames, delays, W, H);
  return { ...out, frameCount: frames.length };
}
module.exports = { render };
