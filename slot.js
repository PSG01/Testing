// 슬롯 심볼: weight=등장 가중치, three=3개 일치 시 배당(베팅×배당)
const SYMBOLS = [
  { e: "🍒", weight: 30, three: 6 },
  { e: "🍋", weight: 25, three: 9 },
  { e: "🔔", weight: 18, three: 14 },
  { e: "⭐", weight: 12, three: 22 },
  { e: "💎", weight: 10, three: 55 },
  { e: "7️⃣", weight: 5, three: 177 }, // 잭팟
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);
const CHERRY = "🍒";

function pickOne() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    if ((r -= s.weight) < 0) return s.e;
  }
  return SYMBOLS[0].e;
}

// 최종 릴 3칸 뽑기
function spin() {
  return [pickOne(), pickOne(), pickOne()];
}

// 배당 계산 → { mult, label, jackpot }
function payout(reels) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    const sym = SYMBOLS.find((s) => s.e === a);
    return {
      mult: sym.three,
      label: a === "7️⃣" ? "🎉 잭팟! 777 🎉" : `✨ ${a}${a}${a} 3개 일치!`,
      jackpot: a === "7️⃣",
    };
  }
  // 체리 2개 → 2배
  const cherries = reels.filter((x) => x === CHERRY).length;
  if (cherries === 2) return { mult: 2, label: "🍒🍒 체리 2개!", jackpot: false };
  return { mult: 0, label: "꽝! 다음 기회에 🍀", jackpot: false };
}

// 애니메이션 프레임: 빠르게 돌다가 릴을 왼쪽부터 하나씩 고정
function frames(final) {
  const rnd = () => pickOne();
  return [
    [rnd(), rnd(), rnd()], // 빠른 회전
    [rnd(), rnd(), rnd()],
    [rnd(), rnd(), rnd()],
    [final[0], rnd(), rnd()], // 1번 릴 고정
    [final[0], final[1], rnd()], // 2번 릴 고정
    [final[0], final[1], final[2]], // 3번 릴 고정
  ];
}

// 릴 표시 문자열
function render(reels) {
  return `\n\`\`\`\n┌────┬────┬────┐\n│ ${reels[0]} │ ${reels[1]} │ ${reels[2]} │\n└────┴────┴────┘\n\`\`\``;
}

// 배당표 텍스트
function paytable() {
  return SYMBOLS.map((s) => `${s.e}${s.e}${s.e} → ${s.three}배`).join("\n") + "\n🍒🍒 (체리 2개) → 2배";
}

module.exports = { SYMBOLS, spin, payout, frames, render, paytable };
