// ── 룰렛 (유러피언, 0~36) ─────────────────────────────────────────
// 휠 순서(실제 유러피언 배열)와 색. RTP ≈ 97.3% (단일 0)
const ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function colorOf(n) { return n === 0 ? "green" : RED.has(n) ? "red" : "black"; }
function spin() { return ORDER[Math.floor(Math.random() * ORDER.length)]; }

// betType: red|black|odd|even|number, pick: 숫자 베팅일 때 0~36
// 반환: 배당 배수 (0이면 패배)
function payout(betType, result, pick) {
  if (betType === "number") return result === pick ? 36 : 0;
  if (result === 0) return 0; // 0은 모든 이븐머니 베팅 패배
  if (betType === "red") return RED.has(result) ? 2 : 0;
  if (betType === "black") return !RED.has(result) ? 2 : 0;
  if (betType === "odd") return result % 2 === 1 ? 2 : 0;
  if (betType === "even") return result % 2 === 0 ? 2 : 0;
  return 0;
}

const TYPE_LABEL = { red: "🔴 빨강", black: "⚫ 검정", odd: "홀수", even: "짝수", number: "숫자" };

module.exports = { ORDER, RED, colorOf, spin, payout, TYPE_LABEL };
