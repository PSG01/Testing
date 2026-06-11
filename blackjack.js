const { newDeck } = require("./cards");

// 핸드 점수 계산 (A는 11 또는 1, 버스트 방지로 자동 조정)
function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      total += 11;
      aces++;
    } else if (["K", "Q", "J"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank, 10);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

// 새 게임 시작: 덱, 플레이어 2장, 딜러 2장
function start() {
  const deck = newDeck();
  const player = [deck.pop(), deck.pop()];
  const dealer = [deck.pop(), deck.pop()];
  return { deck, player, dealer };
}

// 딜러는 17 이상이 될 때까지 히트 (소프트17도 스탠드)
function dealerPlay(deck, dealer) {
  while (handValue(dealer) < 17) dealer.push(deck.pop());
  return dealer;
}

// 결과 판정 → { result: 'win'|'lose'|'push'|'blackjack', mult }
// mult: 베팅 대비 돌려받는 배수 (이기면 2 = 베팅+상금, 블랙잭 2.5, 무승부 1, 패배 0)
function settle(player, dealer) {
  const p = handValue(player);
  const d = handValue(dealer);
  const pBJ = isBlackjack(player);
  const dBJ = isBlackjack(dealer);

  if (pBJ && dBJ) return { result: "push", mult: 1, label: "둘 다 블랙잭 — 무승부" };
  if (pBJ) return { result: "blackjack", mult: 2.5, label: "🃏 블랙잭! (1.5배 지급)" };
  if (dBJ) return { result: "lose", mult: 0, label: "딜러 블랙잭 — 패배" };
  if (p > 21) return { result: "lose", mult: 0, label: "버스트! — 패배" };
  if (d > 21) return { result: "win", mult: 2, label: "딜러 버스트 — 승리!" };
  if (p > d) return { result: "win", mult: 2, label: "승리!" };
  if (p < d) return { result: "lose", mult: 0, label: "패배" };
  return { result: "push", mult: 1, label: "무승부 (베팅 반환)" };
}

module.exports = { handValue, isBlackjack, start, dealerPlay, settle };
