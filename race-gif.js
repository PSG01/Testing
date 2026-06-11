// ── 경마 GIF: 6마리 경주 → 사진판독 → 우승 배너 ───────────────────
const { framesToGif, seededRand } = require("./utils");

const W = 480, H = 320, LANES = 6;
const TRACK_TOP = 56, LANE_H = 36;
const START_X = 26, FINISH_X = W - 56;
const COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"];

function horse(x, y, color, num, phase) {
  // 옆모습 말: 몸통 + 머리 + 다리(2프레임 교차) + 꼬리 + 기수 번호
  const legA = phase % 2 === 0;
  const leg = (lx, fwd) => `<line x1="${x + lx}" y1="${y + 10}" x2="${x + lx + (fwd ? 7 : -7)}" y2="${y + 22}" stroke="#5a3f28" stroke-width="4" stroke-linecap="round"/>`;
  return `<g>
    <path d="M ${x - 22} ${y + 2} Q ${x - 30} ${y - 8} ${x - 24} ${y - 12} Q ${x - 18} ${y - 4} ${x - 20} ${y + 4} Z" fill="${color}" opacity="0.8"/>
    <ellipse cx="${x}" cy="${y + 2}" rx="22" ry="12" fill="${color}" stroke="#3a2a1a" stroke-width="2.5"/>
    ${leg(-14, legA)}${leg(-6, !legA)}${leg(6, legA)}${leg(14, !legA)}
    <path d="M ${x + 16} ${y - 4} Q ${x + 30} ${y - 14} ${x + 34} ${y - 4} L ${x + 30} ${y + 2} Q ${x + 24} ${y + 4} ${x + 18} ${y + 2} Z" fill="${color}" stroke="#3a2a1a" stroke-width="2.5"/>
    <circle cx="${x + 31}" cy="${y - 6}" r="2" fill="#1d1d28"/>
    <path d="M ${x + 18} ${y - 8} L ${x + 26} ${y - 12} L ${x + 28} ${y - 6}" fill="#3a2a1a"/>
    <circle cx="${x - 2}" cy="${y - 12}" r="9" fill="#fff" stroke="#3a2a1a" stroke-width="2.5"/>
    <text x="${x - 2}" y="${y - 7}" font-size="13" font-weight="bold" fill="#1d1d28" text-anchor="middle" font-family="DejaVu Sans">${num}</text>
  </g>`;
}

function dust(x, y, t, seed) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 3; i++) {
    const d = (8 + rnd() * 22) * (0.4 + t);
    s += `<circle cx="${x - 24 - d}" cy="${y + 14 + (rnd() - 0.5) * 8}" r="${3.5 * (1 - t) + 1.5}" fill="#cbb792" opacity="${(0.4 * (1 - t)).toFixed(2)}"/>`;
  }
  return s;
}

function track(header, headColor) {
  let s = `<rect width="${W}" height="${H}" rx="18" fill="#1e3a1e"/>`;
  s += `<text x="${W / 2}" y="34" font-size="22" font-weight="bold" fill="${headColor}" text-anchor="middle" font-family="DejaVu Sans">${header}</text>`;
  for (let i = 0; i < LANES; i++) {
    const y = TRACK_TOP + i * LANE_H;
    s += `<rect x="8" y="${y}" width="${W - 16}" height="${LANE_H - 4}" rx="6" fill="${i % 2 ? "#8a6a44" : "#96754d"}"/>`;
  }
  // 결승선 (체커)
  for (let i = 0; i < LANES * 3; i++)
    s += `<rect x="${FINISH_X + (i % 2 ? 0 : 7)}" y="${TRACK_TOP + i * 12}" width="7" height="12" fill="${i % 2 ? "#fff" : "#1d1d28"}"/>`;
  return s;
}

// winner: 0~5. 반환: { gif, finalPng, durationMs }
async function render(winner) {
  const rnd = seededRand(winner * 97 + 13);
  const RUN_F = 26;
  // 말별 결승 도달 프레임: 우승마가 가장 먼저
  const finishF = Array.from({ length: LANES }, (_, i) => (i === winner ? RUN_F : RUN_F + 2 + Math.floor(rnd() * 6)));
  // 프레임별 진행률: 단조 증가 + 흔들림(엎치락뒤치락)
  const pos = Array.from({ length: LANES }, (_, i) => {
    const arr = [0];
    for (let f = 1; f <= RUN_F; f++) {
      const base = Math.min(1, f / finishF[i]);
      const jitter = Math.sin(f * (0.6 + i * 0.13) + i * 2.2) * 0.045 * (1 - base);
      arr.push(Math.max(arr[f - 1] + 0.004, Math.min(1, base + jitter)));
    }
    return arr;
  });

  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };

  // 출발 카운트
  for (const [txt, col] of [["제자리에...", "#e8d8b8"], ["준비...", "#ffd770"], ["출발! 🔫", "#9bf0c0"]]) {
    let body = track("🏇 HORSE RACE", "#ffd770");
    for (let i = 0; i < LANES; i++) body += horse(START_X + 24, TRACK_TOP + i * LANE_H + 12, COLORS[i], i + 1, 0);
    body += `<text x="${W / 2}" y="${H - 14}" font-size="17" font-weight="bold" fill="${col}" text-anchor="middle" font-family="DejaVu Sans">${txt}</text>`;
    add(body.startsWith("<svg") ? body : `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`, 600);
  }
  // 레이스
  for (let f = 1; f <= RUN_F; f++) {
    let body = track("🏇 HORSE RACE", "#ffd770");
    for (let i = 0; i < LANES; i++) {
      const x = START_X + 24 + pos[i][f] * (FINISH_X - START_X - 30);
      const y = TRACK_TOP + i * LANE_H + 12;
      body += dust(x, y, (f % 3) / 3, i + f * 7) + horse(x, y, COLORS[i], i + 1, f);
    }
    add(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`, f > RUN_F - 5 ? 95 : 75);
  }
  // 결과 배너
  let final = track("🏇 HORSE RACE", "#ffd770");
  for (let i = 0; i < LANES; i++) {
    const x = START_X + 24 + (i === winner ? 1 : pos[i][RUN_F]) * (FINISH_X - START_X - 30);
    final += horse(x, TRACK_TOP + i * LANE_H + 12, COLORS[i], i + 1, 0);
  }
  final += `<rect x="${W / 2 - 130}" y="${H / 2 - 30}" width="260" height="60" rx="14" fill="#1d1d28" opacity="0.92" stroke="#ffd770" stroke-width="3"/>
    <text x="${W / 2}" y="${H / 2 + 9}" font-size="24" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">🏆 ${winner + 1}번마 우승!</text>`;
  for (let f = 0; f < 2; f++) add(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${final}</svg>`, 200);
  add(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${final}</svg>`, 2400);

  return framesToGif(frames, delays, W, H);
}

module.exports = { render, COLORS, LANES };
