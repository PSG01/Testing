// ── 주사위 대결 GIF: 두 주사위가 굴러가다 멈춤 ────────────────────
const sharp = require("sharp");

const W = 480, H = 300, DS = 100;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const PIP = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function die(cx, cy, s, val, rot, color = "#f7f5ef") {
  const r = s * 0.18, p = s * 0.27, pr = s * 0.09;
  let pips = "";
  for (const [dx, dy] of PIP[val]) pips += `<circle cx="${dx * p}" cy="${dy * p}" r="${pr}" fill="#1d2030"/>`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${r}" fill="${color}" stroke="#cfd2dd" stroke-width="2.5"/>
    ${pips}</g>`;
}

function shell(body, title, color) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.4" r="1"><stop offset="0" stop-color="#14532d"/><stop offset="1" stop-color="#06200f"/></radialGradient></defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="18" fill="none" stroke="#caa84a" stroke-width="3" opacity="0.7"/>
    <text x="${W / 2}" y="40" font-size="22" font-weight="bold" fill="${color}" text-anchor="middle" font-family="DejaVu Sans">${title}</text>
    ${body}
  </svg>`;
}

// a,b: 두 사람의 (주사위2개 합) — dice: [a1,a2,b1,b2]
async function render(nameA, nameB, dice) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  const rnd = () => 1 + Math.floor(Math.random() * 6);
  const X = [80, 178, 302, 400]; // a1 a2 b1 b2 (왼쪽 둘 = A, 오른쪽 둘 = B)
  const CY = 168;

  // 굴러가는 중 (위에서 떨어지며 회전)
  const ROLL = 14;
  for (let f = 1; f <= ROLL; f++) {
    const t = easeOutCubic(f / ROLL);
    let body = `<line x1="${W / 2}" y1="64" x2="${W / 2}" y2="${H - 24}" stroke="#caa84a" stroke-width="1.5" opacity="0.4" stroke-dasharray="6 6"/>`;
    body += `<text x="${(X[0] + X[1]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameA}</text>`;
    body += `<text x="${(X[2] + X[3]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameB}</text>`;
    for (let i = 0; i < 4; i++) {
      const settled = t > 0.78 + i * 0.05;
      const v = settled ? dice[i] : rnd();
      const drop = settled ? 0 : (1 - t) * 90;
      const rot = settled ? 0 : (f * 67 + i * 90) % 360;
      body += die(X[i], CY - drop, DS * 0.78, v, rot);
    }
    add(shell(body, "DICE DUEL", "#caa84a"), f < ROLL - 3 ? 70 : 110);
  }
  // 결과
  const sumA = dice[0] + dice[1], sumB = dice[2] + dice[3];
  const title = sumA === sumB ? `무승부  ${sumA} : ${sumB}` : sumA > sumB ? `${nameA} 승리!  ${sumA} : ${sumB}` : `${nameB} 승리!  ${sumA} : ${sumB}`;
  let body = `<line x1="${W / 2}" y1="64" x2="${W / 2}" y2="${H - 24}" stroke="#caa84a" stroke-width="1.5" opacity="0.4" stroke-dasharray="6 6"/>`;
  body += `<text x="${(X[0] + X[1]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameA} (${sumA})</text>`;
  body += `<text x="${(X[2] + X[3]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameB} (${sumB})</text>`;
  for (let i = 0; i < 4; i++) body += die(X[i], CY, DS * 0.78, dice[i], 0, sumA === sumB ? "#f7f5ef" : (i < 2) === (sumA > sumB) ? "#fff3c4" : "#e3e3e3");
  for (let f = 0; f < 2; f++) { add(shell(body, title, f ? "#ffd770" : "#fff"), 160); }
  add(shell(body, title, "#ffd770"), 2200);

  const pngs = [];
  for (const svg of frames) pngs.push(await sharp(Buffer.from(svg)).png().toBuffer());
  const gif = await sharp(pngs, { join: { across: 1, animated: true } }).gif({ loop: 1, delay: delays }).toBuffer();
  return { gif, finalPng: pngs[pngs.length - 1], durationMs: delays.reduce((a, b) => a + b, 0) };
}

module.exports = { render };
