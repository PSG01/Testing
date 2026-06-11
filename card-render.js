// ── 카드 테이블 이미지 렌더러 (블랙잭/하이로우, PNG) ───────────────
const sharp = require("sharp");

const CW = 88, CH = 124; // 카드 크기
const RED = new Set(["♥", "♦"]);
const SUIT_PATH = {
  "♠": (s) => `<path d="M0 -${s} C ${s} -${s * 0.1} ${s * 0.8} ${s * 0.55} 0.01 ${s * 0.2} C -${s * 0.8} ${s * 0.55} -${s} -${s * 0.1} 0 -${s} Z M 0 ${s * 0.1} L ${s * 0.32} ${s * 0.78} L -${s * 0.32} ${s * 0.78} Z" `,
  "♥": (s) => `<path d="M 0 ${s * 0.85} C -${s} ${s * 0.05} -${s * 0.6} -${s * 0.75} 0 -${s * 0.25} C ${s * 0.6} -${s * 0.75} ${s} ${s * 0.05} 0 ${s * 0.85} Z" `,
  "♦": (s) => `<path d="M 0 -${s} L ${s * 0.7} 0 L 0 ${s} L -${s * 0.7} 0 Z" `,
  "♣": (s) => `<path d="M 0 -${s} A ${s * 0.42} ${s * 0.42} 0 1 1 -0.01 -${s} Z M ${s * 0.42} -${s * 0.05} A ${s * 0.42} ${s * 0.42} 0 1 1 ${s * 0.41} -${s * 0.06} Z M -${s * 0.42} -${s * 0.05} A ${s * 0.42} ${s * 0.42} 0 1 1 -${s * 0.43} -${s * 0.06} Z M 0 ${s * 0.05} L ${s * 0.3} ${s * 0.85} L -${s * 0.3} ${s * 0.85} Z" `,
};

function suit(sym, x, y, size, color) {
  return `<g transform="translate(${x} ${y})">${SUIT_PATH[sym](size)}fill="${color}"/></g>`;
}

function card(x, y, c, hidden = false) {
  if (hidden) {
    return `<g><rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="#3b2a6b" stroke="#ffd770" stroke-width="2.5"/>
      <rect x="${x + 9}" y="${y + 9}" width="${CW - 18}" height="${CH - 18}" rx="6" fill="none" stroke="#9b7ae0" stroke-width="2"/>
      <circle cx="${x + CW / 2}" cy="${y + CH / 2}" r="16" fill="#9b7ae0" opacity="0.6"/></g>`;
  }
  const col = RED.has(c.suit) ? "#d6293a" : "#1d2030";
  return `<g><rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="10" fill="#f7f5ef" stroke="#cfd2dd" stroke-width="1.5"/>
    <text x="${x + 11}" y="${y + 28}" font-size="24" font-weight="bold" fill="${col}" font-family="DejaVu Sans">${c.rank}</text>
    ${suit(c.suit, x + 17, y + 44, 9, col)}
    ${suit(c.suit, x + CW / 2, y + CH / 2 + 8, 23, col)}
  </g>`;
}

function hand(cards, x, y, hideFirst = false) {
  let s = "";
  const step = Math.min(CW + 10, cards.length > 1 ? (cards.length > 4 ? 56 : 72) : 0) || 0;
  cards.forEach((c, i) => { s += card(x + i * (cards.length > 4 ? 56 : 72), y, c, hideFirst && i === 0); });
  return s;
}

function shell(body, W, H, title, titleColor) {
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.35" r="1"><stop offset="0" stop-color="#14532d"/><stop offset="1" stop-color="#06200f"/></radialGradient></defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="18" fill="none" stroke="#caa84a" stroke-width="3" opacity="0.7"/>
    <text x="${W / 2}" y="36" font-size="23" font-weight="bold" fill="${titleColor}" text-anchor="middle" font-family="DejaVu Sans">${title}</text>
    ${body}
  </svg>`;
}

// 블랙잭 테이블: 딜러(위) / 플레이어(아래)
async function blackjackPng(game, { reveal = false, dealerVal = "?", playerVal = "", resultText = null } = {}) {
  const maxN = Math.max(game.dealer.length, game.player.length);
  const W = Math.max(430, 40 + maxN * 72 + CW);
  const H = 410;
  let body = `<text x="28" y="76" font-size="17" fill="#cfe8d4" font-family="DejaVu Sans">DEALER  (${dealerVal})</text>`;
  body += hand(game.dealer, 28, 86, !reveal);
  body += `<text x="28" y="252" font-size="17" fill="#cfe8d4" font-family="DejaVu Sans">YOU  (${playerVal})</text>`;
  body += hand(game.player, 28, 262);
  const title = resultText || "BLACKJACK";
  const svg = shell(body, W, H, title, resultText ? "#ffd770" : "#caa84a");
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// 하이로우: 현재 카드 크게 + (결과면) 다음 카드
async function highlowPng(game, { next = null, label = null, multText = "" } = {}) {
  const W = 430, H = 320;
  let body = "";
  if (next) {
    body += card(85, 86, game.current);
    body += `<text x="${W / 2}" y="${160}" font-size="34" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">→</text>`;
    body += card(W - 85 - CW, 86, next);
  } else {
    body += card((W - CW) / 2, 86, game.current);
  }
  body += `<text x="${W / 2}" y="${H - 36}" font-size="18" fill="#cfe8d4" text-anchor="middle" font-family="DejaVu Sans">${multText}</text>`;
  const svg = shell(body, W, H, label || "HIGH · LOW", label ? "#ffd770" : "#caa84a");
  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { blackjackPng, highlowPng };
