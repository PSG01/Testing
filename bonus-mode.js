// ── 프리스핀(보너스) 전용 GIF: 은은한 반짝이 + 과일 ───────────────
const sharp = require("sharp");
const fruit = require("./fruit-symbols");

const COLS = 5, ROWS = 5, CELL = 72, GAP = 8, PAD = 18, HEADER = 64;
const GRID_W = COLS * CELL + (COLS - 1) * GAP, GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
const W = GRID_W + PAD * 2, H = HEADER + GRID_H + PAD, GRID_TOP = HEADER;

const cx = (c) => PAD + c * (CELL + GAP);
const cyR = (r) => GRID_TOP + r * (CELL + GAP);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const rnd = (s) => { const x = Math.sin(s * 127.1) * 43758.5; return x - Math.floor(x); };

function gridBody(grid) {
  let s = "";
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) s += fruit.symbol(grid[r][c], cx(c), cyR(r), CELL);
  return s;
}

const SPARKS = 26;
function sparkles(tick) {
  let s = "";
  for (let i = 0; i < SPARKS; i++) {
    const x = rnd(i + 1) * W, y = rnd(i + 99) * H;
    const phase = (tick * 0.06 + rnd(i + 7)) % 1;
    const tw = Math.sin(phase * Math.PI);
    const r = 1.5 + tw * 2.5, op = 0.15 + tw * 0.6;
    const col = i % 3 === 0 ? "#fff6cf" : "#ffd770";
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${col}" opacity="${op.toFixed(2)}"/>`;
    if (tw > 0.8) s += `<path d="M ${x.toFixed(1)} ${(y - r * 2.2).toFixed(1)} L ${x.toFixed(1)} ${(y + r * 2.2).toFixed(1)} M ${(x - r * 2.2).toFixed(1)} ${y.toFixed(1)} L ${(x + r * 2.2).toFixed(1)} ${y.toFixed(1)}" stroke="#fff6cf" stroke-width="1" opacity="${(op * 0.7).toFixed(2)}"/>`;
  }
  return s;
}

function shell(body, head, tick) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="0.5" cy="0.42" r="0.85"><stop offset="0" stop-color="#7a1530"/><stop offset="0.6" stop-color="#4a0d22"/><stop offset="1" stop-color="#23060f"/></radialGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e1226"/><stop offset="1" stop-color="#3a0a18"/></linearGradient>
    </defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    ${sparkles(tick)}
    <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="20" fill="none" stroke="#ffcf57" stroke-width="3" opacity="0.85"/>
    <rect x="${PAD - 6}" y="${GRID_TOP - 6}" width="${GRID_W + 12}" height="${GRID_H + 12}" rx="16" fill="url(#panel)" stroke="#ffcf57" stroke-width="2" opacity="0.92"/>
    <text x="${W / 2}" y="30" font-size="22" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">✦ FREE SPINS ✦</text>
    <text x="${W / 2}" y="52" font-size="17" fill="${head.color || "#ffe9a8"}" text-anchor="middle" font-family="DejaVu Sans">${head.text}</text>
    <g>${body}</g>
  </svg>`;
}

function build(bonus, count) {
  const frames = [], delays = [];
  let tick = 0;
  const add = (body, head, ms) => { frames.push(shell(body, head, tick)); delays.push(ms); tick++; };

  for (let f = 0; f < 10; f++) add("", { text: `${count} SPINS 시작!`, color: "#fff" }, 80);

  let running = 0;
  bonus.spins.forEach((sp, i) => {
    const grid = sp.grid;
    for (let f = 1; f <= 6; f++) {
      const e = easeOutCubic(f / 6);
      let body = "";
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const sR = -ROWS - 1, cur = sR + (r - sR) * e; body += fruit.symbol(grid[r][c], cx(c), cyR(cur), CELL); }
      add(body, { text: `SPIN ${i + 1}/${count}  ·  x${sp.mult}`, color: "#ffe9a8" }, 55);
    }
    running += sp.win;
    add(gridBody(grid), { text: `SPIN ${i + 1}/${count}  ·  x${sp.mult}  ·  +${sp.win.toLocaleString()}`, color: "#9bf0c0" }, 480);
    add(gridBody(grid), { text: `BONUS  ${running.toLocaleString()}`, color: "#ffd770" }, 340);
  });

  for (let f = 0; f < 10; f++) add("", { text: `TOTAL BONUS  ${bonus.total.toLocaleString()}`, color: f % 2 ? "#fff" : "#ffd770" }, 130);
  add("", { text: `TOTAL BONUS  ${bonus.total.toLocaleString()}`, color: "#9bf0c0" }, 2000);
  return { frames, delays };
}

async function toGif(frames, delays) {
  const pngs = [];
  for (const svg of frames) pngs.push(await sharp(Buffer.from(svg)).png().toBuffer());
  return sharp(pngs, { join: { across: 1, animated: true } }).gif({ loop: 1, delay: delays }).toBuffer();
}
async function render(bonus, count) {
  const { frames, delays } = build(bonus, count);
  const pngs = [];
  for (const svg of frames) pngs.push(await sharp(Buffer.from(svg)).png().toBuffer());
  const gif = await sharp(pngs, { join: { across: 1, animated: true } }).gif({ loop: 1, delay: delays }).toBuffer();
  return { gif, frameCount: frames.length, finalPng: pngs[pngs.length - 1], durationMs: delays.reduce((a, b) => a + b, 0) };
}
module.exports = { render };
