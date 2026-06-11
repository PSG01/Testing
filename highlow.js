const { SUITS, RANKS } = require("./cards");

const RTP = 0.92; // 한 번 맞힐 때마다 환수율 92% (집 우위 8%)

function randomCard() {
  return {
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
  };
}

function value(card) {
  return RANKS.indexOf(card.rank) + 1; // A=1 ... K=13
}

// 현재 카드 기준 확률 — 동점은 무승부(푸시)라 승률 계산에서 제외(조건부 확률)
function probs(card) {
  const v = value(card);
  let higher = 0,
    lower = 0;
  for (let i = 1; i <= 13; i++) {
    if (i > v) higher++;
    else if (i < v) lower++;
  }
  const nonTie = higher + lower; // 12
  return { higher: higher / nonTie, lower: lower / nonTie };
}

// 다음 단계 배수 (확률이 낮은 쪽일수록 큼). 확률 0이면 null(선택 못 함)
function stepMult(prob) {
  if (prob <= 0) return null;
  return Math.round((RTP / prob) * 100) / 100;
}

// 추측 판정: 'win' | 'lose' | 'push'(동점 무승부 — 카드만 교체되고 계속)
function judge(current, next, guess) {
  const cv = value(current),
    nv = value(next);
  if (nv === cv) return "push";
  return (guess === "higher" ? nv > cv : nv < cv) ? "win" : "lose";
}

module.exports = { randomCard, value, probs, stepMult, judge };
