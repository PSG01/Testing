// ── 카드 공용 모듈 ─────────────────────────────────────────────────
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// 새 덱 생성 후 셔플
function newDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 하이로우용 숫자값 (A=1 ... K=13)
function rankValue(card) {
  return RANKS.indexOf(card.rank) + 1;
}

// 카드 한 장 텍스트 (빨강/검정 구분은 이모지로)
function cardStr(card) {
  return `\`${card.rank}${card.suit}\``;
}

// 뒤집힌 카드(히든)
const HIDDEN = "`🂠`";

function handStr(cards, hideFirst = false) {
  return cards.map((c, i) => (hideFirst && i === 0 ? HIDDEN : cardStr(c))).join(" ");
}

module.exports = { SUITS, RANKS, newDeck, rankValue, cardStr, handStr, HIDDEN };
