// ── 노가다(광산 캐기) GIF: 곡괭이 3타 → 바위 균열 → 광물 등장 ─────
const { framesToGif, easeOutBack, seededRand } = require("./utils");

const W = 360, H = 250;

function rock(cx, cy, crack) {
  // 울퉁불퉁한 바위 + 단계별 균열
  let s = `<polygon points="${cx - 70},${cy + 50} ${cx - 78},${cy + 6} ${cx - 44},${cy - 38} ${cx + 8},${cy - 52} ${cx + 58},${cy - 30} ${cx + 76},${cy + 14} ${cx + 62},${cy + 50}" fill="#8a8a96" stroke="#55555f" stroke-width="4"/>`;
  s += `<polygon points="${cx - 44},${cy - 36} ${cx + 6},${cy - 48} ${cx + 30},${cy - 30} ${cx - 20},${cy - 22}" fill="#a2a2ae" opacity="0.8"/>`;
  if (crack >= 1) s += `<path d="M ${cx - 10} ${cy - 50} L ${cx + 2} ${cy - 20} L ${cx - 12} ${cy + 6}" stroke="#3a3a44" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (crack >= 2) s += `<path d="M ${cx + 2} ${cy - 20} L ${cx + 28} ${cy + 2} M ${cx - 12} ${cy + 6} L ${cx - 38} ${cy + 22} M ${cx + 2} ${cy - 18} L ${cx - 4} ${cy + 30}" stroke="#3a3a44" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  return s;
}

function pickaxe(cx, cy, angle) {
  // 손잡이 + 양날 곡괭이, (cx,cy)를 축으로 회전
  return `<g transform="rotate(${angle} ${cx} ${cy})">
    <rect x="${cx - 5}" y="${cy - 84}" width="10" height="84" rx="4" fill="#8a6444" stroke="#5a3f28" stroke-width="2.5"/>
    <path d="M ${cx - 44} ${cy - 76} Q ${cx} ${cy - 104} ${cx + 44} ${cy - 76} L ${cx + 38} ${cy - 66} Q ${cx} ${cy - 90} ${cx - 38} ${cy - 66} Z" fill="#cfd6e6" stroke="#7a8498" stroke-width="2.5"/>
  </g>`;
}

function gem(cx, cy, color, scale, tier) {
  if (tier === 0) // 꽝: 시든 잡초
    return `<g transform="translate(${cx} ${cy}) scale(${scale})"><path d="M0 16 C -4 4 -14 0 -16 -10 C -6 -6 -4 -2 0 -14 C 4 -2 6 -6 16 -10 C 14 0 4 4 0 16 Z" fill="#7a9a4a" stroke="#4e6a2c" stroke-width="2"/></g>`;
  if (tier === 1) // 돌멩이
    return `<g transform="translate(${cx} ${cy}) scale(${scale})"><polygon points="-14,10 -16,-4 -4,-14 10,-12 16,2 8,12" fill="#b0b0ba" stroke="#6a6a74" stroke-width="2"/></g>`;
  // 광물(철/은/금/다이아): 보석 컷
  return `<g transform="translate(${cx} ${cy}) scale(${scale})">
    <polygon points="0,-18 14,-6 9,14 -9,14 -14,-6" fill="${color}" stroke="#fff" stroke-width="2"/>
    <polygon points="0,-18 5,-2 -5,-2" fill="#ffffff" opacity="0.55"/>
    <polygon points="-14,-6 -5,-2 -9,14" fill="#000" opacity="0.12"/>
  </g>`;
}

function sparkles(cx, cy, t, seed, color) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, d = (16 + rnd() * 48) * t;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d - 18 * t;
    const r = 3 + rnd() * 4;
    s += `<path d="M ${x} ${y - r} L ${x + r * 0.35} ${y - r * 0.35} L ${x + r} ${y} L ${x + r * 0.35} ${y + r * 0.35} L ${x} ${y + r} L ${x - r * 0.35} ${y + r * 0.35} L ${x - r} ${y} L ${x - r * 0.35} ${y - r * 0.35} Z" fill="${color}" opacity="${(1 - t * 0.5).toFixed(2)}"/>`;
  }
  return s;
}

function debris(cx, cy, t, seed) {
  const rnd = seededRand(seed);
  let s = "";
  for (let i = 0; i < 7; i++) {
    const dir = rnd() > 0.5 ? 1 : -1;
    const x = cx + dir * (10 + rnd() * 55) * t, y = cy - (30 + rnd() * 40) * t + 80 * t * t;
    s += `<rect x="${x}" y="${y}" width="${4 + rnd() * 5}" height="${4 + rnd() * 5}" fill="#6a6a74" opacity="${(1 - t * 0.6).toFixed(2)}" transform="rotate(${(rnd() * 360).toFixed(0)} ${x} ${y})"/>`;
  }
  return s;
}

function shell(body, title, color = "#e8d8b8", shake = 0) {
  const dx = shake ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.35" r="1"><stop offset="0" stop-color="#3a2f26"/><stop offset="1" stop-color="#1c150f"/></radialGradient></defs>
    <rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/>
    <rect x="0" y="${H - 44}" width="${W}" height="44" fill="#2a2018"/>
    <g transform="translate(${dx},0)">${body}</g>
    <text x="${W / 2}" y="32" font-size="20" font-weight="bold" fill="${color}" text-anchor="middle" font-family="DejaVu Sans">${title}</text>
  </svg>`;
}

// ore: { label, color, tier(0~5), coins }
async function render(ore) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  const RX = W / 2, RY = H - 100; // 바위 중심
  const PX = RX + 80, PY = RY + 36; // 곡괭이 축

  // 3회 타격: 들어올림 → 내려찍기(오버슈트) → 파편
  for (let hit = 0; hit < 3; hit++) {
    for (let f = 0; f < 4; f++) {
      const t = f / 3;
      const angle = f < 2 ? -70 + t * 30 : easeOutBack(Math.min(1, (t - 0.33) / 0.67), 1.6) * 55 - 40;
      const impact = f === 3;
      add(shell(
        rock(RX, RY, hit) + pickaxe(PX, PY, impact ? 18 : angle) +
        (impact ? debris(RX - 20, RY - 20, 0.35, hit + 5) + `<circle cx="${RX - 18}" cy="${RY - 16}" r="10" fill="#fff" opacity="0.7"/>` : ""),
        "⛏ 채굴 중...", "#e8d8b8", impact ? 7 : 0
      ), impact ? 150 : 80);
    }
    add(shell(rock(RX, RY, hit + (hit < 2 ? 0 : 0)) + pickaxe(PX, PY, -30) + debris(RX - 20, RY - 10, 0.8, hit + 5), "⛏ 채굴 중...", "#e8d8b8"), 90);
  }
  // 바위 붕괴 + 광물 등장
  for (let f = 0; f < 5; f++) {
    const t = (f + 1) / 5;
    const sc = easeOutBack(t, 2.2) * 2.2;
    add(shell(
      debris(RX, RY, t, 21) +
      gem(RX, RY - 8, ore.color, Math.max(0.2, sc), ore.tier) +
      (ore.tier >= 2 ? sparkles(RX, RY - 10, t, 33, ore.color) : ""),
      t === 1 ? `${ore.label} 발견!` : "💥", ore.tier >= 4 ? "#ffd770" : "#e8d8b8"
    ), f === 0 ? 140 : 110);
  }
  add(shell(
    gem(RX, RY - 8, ore.color, 2.2, ore.tier) + (ore.tier >= 2 ? sparkles(RX, RY - 10, 0.6, 33, ore.color) : ""),
    `${ore.label}  +${ore.coins.toLocaleString()} 🪙`, ore.tier >= 4 ? "#ffd770" : "#9bf0c0"
  ), 2400);

  return framesToGif(frames, delays, W, H);
}

module.exports = { render };
