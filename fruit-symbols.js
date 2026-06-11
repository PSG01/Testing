// ── 과일 심볼 SVG 모듈 ────────────────────────────────────────────
// cascade.js 의 이모지 키(🟦🟩🟪🟧🟥💎🎆)를 과일 그림으로 매핑.
// 각 함수는 (cx,cy,size,scale,alpha) → 셀 중앙 기준 SVG 조각 반환.

// 키 → 과일 이름
const MAP = { "🟦": "star", "🟩": "watermelon", "🟪": "grape", "🟧": "lemon", "🟥": "strawberry", "💎": "gem", "🎆": "scatter",
  "🍒": "cherry", "🍋": "lemon", "🔔": "bell", "⭐": "starGold", "7️⃣": "seven" };
// 화면 표기용 이름
const NAMES = { star: "별", watermelon: "수박", grape: "포도", lemon: "레몬", strawberry: "딸기", cherry: "체리", scatter: "스캐터", gem: "보석", bell: "종", starGold: "별", seven: "세븐" };

function symbol(key, x, y, s, scale = 1, alpha = 1) {
  const off = (s * (scale - 1)) / 2;
  const cx = x + s / 2, cy = y + s / 2, S = s * scale;
  const R = S * 0.34; // 기본 반지름
  const name = MAP[key] || "cherry";
  return `<g opacity="${alpha}" transform="translate(${cx} ${cy}) scale(${scale})">${SHAPES[name](R)}</g>`;
}

// 모든 도형은 (0,0) 중심 기준
const SHAPES = {
  // 체리: 빨간 두 알 + 줄기 + 잎 + 하이라이트
  cherry: (R) => {
    const r = R * 0.62;
    return `
      <path d="M -14 -${R} Q 4 -${R + 8} 16 -${R * 0.4} M -14 -${R} Q -10 -${r * 0.2} -${r * 0.9} ${R * 0.2}" stroke="#5b8a2b" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 14 -${R * 0.9} q 22 -10 30 4 q -20 6 -30 -4 z" fill="#5fae34"/>
      <circle cx="-${r * 0.95}" cy="${R * 0.45}" r="${r}" fill="#e0153b"/>
      <circle cx="${r * 0.95}" cy="${R * 0.5}" r="${r}" fill="#c10f30"/>
      <circle cx="-${r * 1.25}" cy="${R * 0.2}" r="${r * 0.3}" fill="#ff8aa0" opacity="0.8"/>
      <circle cx="${r * 0.65}" cy="${R * 0.25}" r="${r * 0.28}" fill="#ff8aa0" opacity="0.7"/>`;
  },
  // 딸기: 빨간 하트형 몸통 + 씨앗 점 + 초록 꼭지
  strawberry: (R) => {
    return `
      <path d="M 0 ${R} C -${R * 1.5} ${R * 0.2} -${R} -${R} 0 -${R * 0.55} C ${R} -${R} ${R * 1.5} ${R * 0.2} 0 ${R} Z" fill="#ff3b53"/>
      <path d="M 0 -${R * 0.55} C -${R * 0.9} -${R * 0.55} -${R * 0.6} -${R} 0 -${R} C ${R * 0.6} -${R} ${R * 0.9} -${R * 0.55} 0 -${R * 0.55} Z" fill="#3fae3f"/>
      ${seed(-R * 0.4, 0)}${seed(R * 0.4, 0)}${seed(0, R * 0.35)}${seed(-R * 0.55, R * 0.45)}${seed(R * 0.55, R * 0.45)}${seed(0, -R * 0.1)}
      <ellipse cx="-${R * 0.4}" cy="-${R * 0.05}" rx="${R * 0.18}" ry="${R * 0.3}" fill="#ff8a98" opacity="0.6"/>`;
    function seed(x, y) { return `<circle cx="${x}" cy="${y}" r="${R * 0.07}" fill="#ffe27a"/>`; }
  },
  // 포도(보라): 동그란 알 송이 + 잎
  grape: (R) => grapes(R, "#9b5cf0", "#7a3cd0"),
  // 별(파랑): 일반 블록용 별
  star: (R) => `${starPts(R * 1.1, "#4fa3ff", "#2d6fd0", 3)}<circle cx="0" cy="-${R * 0.15}" r="${R * 0.18}" fill="#bfe0ff" opacity="0.7"/>`,
  // 레몬: 노란 타원 + 하이라이트 + 잎
  lemon: (R) => {
    return `
      <ellipse cx="0" cy="0" rx="${R * 1.15}" ry="${R * 0.92}" fill="#ffd11a" transform="rotate(-18)"/>
      <ellipse cx="-${R * 0.35}" cy="-${R * 0.3}" rx="${R * 0.4}" ry="${R * 0.22}" fill="#fff09a" opacity="0.8" transform="rotate(-18)"/>
      <path d="M ${R * 1.0} -${R * 0.55} q 14 -8 20 2 q -12 6 -20 -2 z" fill="#5fae34"/>`;
  },
  // 수박(초록 겉 + 빨강 속 부채꼴)
  watermelon: (R) => {
    return `
      <path d="M -${R * 1.2} ${R * 0.55} A ${R * 1.2} ${R * 1.2} 0 0 1 ${R * 1.2} ${R * 0.55} Z" fill="#2f9e44"/>
      <path d="M -${R * 1.02} ${R * 0.5} A ${R * 1.02} ${R * 1.02} 0 0 1 ${R * 1.02} ${R * 0.5} Z" fill="#8ce06a"/>
      <path d="M -${R * 0.82} ${R * 0.45} A ${R * 0.82} ${R * 0.82} 0 0 1 ${R * 0.82} ${R * 0.45} Z" fill="#ff4d5e"/>
      <circle cx="-${R * 0.35}" cy="${R * 0.05}" r="${R * 0.07}" fill="#2b2b2b"/>
      <circle cx="${R * 0.1}" cy="${R * 0.2}" r="${R * 0.07}" fill="#2b2b2b"/>
      <circle cx="${R * 0.45}" cy="-${R * 0.02}" r="${R * 0.07}" fill="#2b2b2b"/>`;
  },
  // 스캐터: 금색 화려한 별 (링 + 이중 별 + 광채)
  scatter: (R) => {
    return `<circle cx="0" cy="0" r="${R * 1.3}" fill="#ffd23a" opacity="0.18"/>
      ${starPts(R * 1.2, "#ffd23a", "#ff9d2e", 3)}${starPts(R * 0.62, "#fff3b0", "#ffd23a", 1.5)}
      <circle cx="-${R * 0.3}" cy="-${R * 0.35}" r="${R * 0.14}" fill="#ffffff" opacity="0.85"/>`;
  },
  // 보석: 청록 다이아 컷
  gem: (R) => {
    const w = R * 1.15, h = R * 1.05, t = R * 0.45;
    return `<polygon points="-${w} -${t * 0.4} -${w * 0.55} -${h} ${w * 0.55} -${h} ${w} -${t * 0.4} 0 ${h}" fill="#36e6ff" stroke="#b3f6ff" stroke-width="3"/>
      <polygon points="-${w * 0.55} -${h} 0 -${t * 0.4} ${w * 0.55} -${h}" fill="#7df0ff"/>
      <polygon points="-${w} -${t * 0.4} 0 -${t * 0.4} 0 ${h}" fill="#19c8e6" opacity="0.7"/>`;
  },
  // 종: 금색 벨
  bell: (R) => {
    return `<path d="M 0 -${R} C ${R * 0.85} -${R} ${R * 0.85} -${R * 0.1} ${R * 0.9} ${R * 0.45} L ${R * 1.05} ${R * 0.65} L -${R * 1.05} ${R * 0.65} L -${R * 0.9} ${R * 0.45} C -${R * 0.85} -${R * 0.1} -${R * 0.85} -${R} 0 -${R} Z" fill="#ffc83a" stroke="#e6a012" stroke-width="2.5"/>
      <circle cx="0" cy="-${R}" r="${R * 0.16}" fill="#e6a012"/>
      <circle cx="0" cy="${R * 0.82}" r="${R * 0.18}" fill="#e6a012"/>
      <ellipse cx="-${R * 0.35}" cy="-${R * 0.35}" rx="${R * 0.16}" ry="${R * 0.3}" fill="#fff0b0" opacity="0.8"/>`;
  },
  // 금색 별 (슬롯 ⭐)
  starGold: (R) => `${starPts(R * 1.1, "#ffd23a", "#e6a012", 3)}<circle cx="-${R * 0.25}" cy="-${R * 0.3}" r="${R * 0.15}" fill="#fff3b0" opacity="0.85"/>`,
  // 세븐 (잭팟): 빨간 7
  seven: (R) => {
    return `<circle cx="0" cy="0" r="${R * 1.2}" fill="#ffd23a" opacity="0.15"/>
      <text x="0" y="${R * 0.62}" font-size="${R * 2.1}" font-weight="bold" fill="#ff3b53" stroke="#ffd770" stroke-width="2" text-anchor="middle" font-family="DejaVu Sans">7</text>`;
  },
};

function grapes(R, fill, dark) {
  const r = R * 0.32;
  const pos = [[-r, -r * 1.4], [r, -r * 1.4], [0, -r * 0.2], [-r * 1.6, r * 0.2], [r * 1.6, r * 0.2], [-r * 0.6, r], [r * 0.6, r], [0, r * 1.7]];
  let s = `<path d="M 0 -${R * 1.2} q 16 -10 24 0 q -14 8 -24 0 z" fill="#5fae34"/>`;
  for (const [x, y] of pos) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#ffffff" opacity="0.45"/>`;
  return s;
}
function starPts(R, fill, stroke, sw) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? R * 0.45 : R; p.push(`${(rad * Math.cos(a)).toFixed(1)},${(rad * Math.sin(a)).toFixed(1)}`); }
  return `<polygon points="${p.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

module.exports = { symbol, MAP, NAMES, SHAPES };
