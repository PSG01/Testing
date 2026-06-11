// ── 주사위 대결 GIF: 두 주사위가 떨어지며 회전, 잔상 블러 + 바운스 착지 ──
const { framesToGif, easeOutCubic, easeOutBounce, seededRand } = require("./utils");

const W = 480, H = 300, DS = 100;
const PIP = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function die(cx, cy, s, val, rot, color = "#f7f5ef", alpha = 1, squash = 1) {
  const r = s * 0.18, p = s * 0.27, pr = s * 0.09;
  let pips = "";
  for (const [dx, dy] of PIP[val]) pips += `<circle cx="${dx * p}" cy="${dy * p * squash}" r="${pr}" fill="#1d2030"/>`;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})" opacity="${alpha}">
    <rect x="${-s / 2}" y="${-s * squash / 2}" width="${s}" height="${s * squash}" rx="${r}" fill="${color}" stroke="#cfd2dd" stroke-width="2.5"/>
    ${pips}</g>`;
}

// 착지 먼지 파티클
function dust(cx, groundY, t, seed) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 7; i++) {
    const dir = i % 2 ? 1 : -1;
    const x = cx + dir * (24 + rnd() * 44) * t, y = groundY - (6 + rnd() * 16) * t * (1 - t * 0.5);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.5 * (1 - t) + 1).toFixed(1)}" fill="#cfe8d4" opacity="${(0.5 * (1 - t)).toFixed(2)}"/>`;
  }
  return s;
}
// 승자 반짝이
function sparkle(cx, cy, t, seed) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2, d = 56 + rnd() * 26;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    const r = 5 + 4 * Math.sin((t * 2 + i) * Math.PI);
    s += `<path d="M ${x} ${y - r} L ${x + r * 0.3} ${y - r * 0.3} L ${x + r} ${y} L ${x + r * 0.3} ${y + r * 0.3} L ${x} ${y + r} L ${x - r * 0.3} ${y + r * 0.3} L ${x - r} ${y} L ${x - r * 0.3} ${y - r * 0.3} Z" fill="#ffd770" opacity="0.9"/>`;
  }
  return s;
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
  const labels = () =>
    `<line x1="${W / 2}" y1="64" x2="${W / 2}" y2="${H - 24}" stroke="#caa84a" stroke-width="1.5" opacity="0.4" stroke-dasharray="6 6"/>` +
    `<text x="${(X[0] + X[1]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameA}</text>` +
    `<text x="${(X[2] + X[3]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameB}</text>`;

  // 굴러가는 중 (위에서 떨어지며 회전 → 착지 후 감쇠 바운스)
  const ROLL = 18;
  const dropAt = (t, settleT) => (1 - easeOutCubic(Math.min(1, t / settleT))) * 110;
  for (let f = 1; f <= ROLL; f++) {
    const t = f / ROLL;
    let body = labels();
    for (let i = 0; i < 4; i++) {
      const settleT = 0.5 + i * 0.08; // 왼쪽부터 순서대로 착지
      if (t < settleT) {
        const drop = dropAt(t, settleT);
        const prevDrop = dropAt((f - 1) / ROLL, settleT);
        const rot = (f * 67 + i * 90) % 360;
        // 낙하 잔상 (직전 위치에 반투명 고스트)
        if (prevDrop - drop > 8) body += die(X[i], CY - (drop + (prevDrop - drop) * 0.6), DS * 0.78, rnd(), (rot - 40) % 360, "#f7f5ef", 0.28);
        body += die(X[i], CY - drop, DS * 0.78, rnd(), rot);
      } else {
        // 착지 후: 작은 높이에서 easeOutBounce 로 통통 튀며 정지
        const bt = Math.min(1, (t - settleT) / Math.max(0.001, 1 - settleT));
        const hop = 20 * (1 - easeOutBounce(bt));
        const squash = bt < 0.18 && hop < 2 ? 0.86 : 1; // 첫 접지 순간 찌그러짐
        body += die(X[i], CY - hop, DS * 0.78, dice[i], 0, "#f7f5ef", 1, squash);
        if (bt < 0.45) body += dust(X[i], CY + DS * 0.39, bt / 0.45, i + 3);
      }
    }
    add(shell(body, "DICE DUEL", "#caa84a"), f < ROLL - 4 ? 65 : 100);
  }
  // 결과
  const sumA = dice[0] + dice[1], sumB = dice[2] + dice[3];
  const title = sumA === sumB ? `무승부  ${sumA} : ${sumB}` : sumA > sumB ? `${nameA} 승리!  ${sumA} : ${sumB}` : `${nameB} 승리!  ${sumA} : ${sumB}`;
  let body = `<line x1="${W / 2}" y1="64" x2="${W / 2}" y2="${H - 24}" stroke="#caa84a" stroke-width="1.5" opacity="0.4" stroke-dasharray="6 6"/>`;
  body += `<text x="${(X[0] + X[1]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameA} (${sumA})</text>`;
  body += `<text x="${(X[2] + X[3]) / 2}" y="72" font-size="15" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${nameB} (${sumB})</text>`;
  for (let i = 0; i < 4; i++) body += die(X[i], CY, DS * 0.78, dice[i], 0, sumA === sumB ? "#f7f5ef" : (i < 2) === (sumA > sumB) ? "#fff3c4" : "#e3e3e3");
  // 승자 쪽 반짝이
  const winCx = sumA === sumB ? null : sumA > sumB ? (X[0] + X[1]) / 2 : (X[2] + X[3]) / 2;
  for (let f = 0; f < 3; f++) {
    const fx = winCx ? sparkle(winCx, CY, f / 3, 21) : "";
    add(shell(body + fx, title, f % 2 ? "#ffd770" : "#fff"), 150);
  }
  add(shell(body + (winCx ? sparkle(winCx, CY, 0.5, 21) : ""), title, "#ffd770"), 2200);

  return framesToGif(frames, delays, W, H);
}

module.exports = { render };
