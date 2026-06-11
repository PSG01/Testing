const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "economy.json");

// ── 설정값 ─────────────────────────────────────────────────────────
const START_BALANCE = 1000; // 처음 시작 코인
const DAILY_AMOUNT = 500; // 출석 보상
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24시간
const BAILOUT_AMOUNT = 300; // 파산 구제
const BAILOUT_COOLDOWN = 6 * 60 * 60 * 1000; // 6시간

let data = load();
function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data));
}

function getUser(id, name) {
  if (!data[id]) {
    data[id] = {
      balance: START_BALANCE,
      name: name || "플레이어",
      lastDaily: 0,
      lastBailout: 0,
      spins: 0,
      totalWon: 0,
      totalBet: 0,
      biggestWin: 0,
    };
    save();
  }
  if (name) data[id].name = name;
  return data[id];
}

function addBalance(id, n) {
  const u = getUser(id);
  u.balance = Math.max(0, Math.floor(u.balance + n));
  save();
  return u.balance;
}

function claimDaily(id, name) {
  const u = getUser(id, name);
  const now = Date.now();
  const elapsed = now - u.lastDaily;
  if (elapsed < DAILY_COOLDOWN) {
    return { ok: false, remaining: DAILY_COOLDOWN - elapsed };
  }
  u.lastDaily = now;
  u.balance += DAILY_AMOUNT;
  save();
  return { ok: true, amount: DAILY_AMOUNT, balance: u.balance };
}

function claimBailout(id, name) {
  const u = getUser(id, name);
  const now = Date.now();
  if (u.balance > 0) return { ok: false, reason: "still_have", balance: u.balance };
  if (now - u.lastBailout < BAILOUT_COOLDOWN) {
    return { ok: false, reason: "cooldown", remaining: BAILOUT_COOLDOWN - (now - u.lastBailout) };
  }
  u.lastBailout = now;
  u.balance += BAILOUT_AMOUNT;
  save();
  return { ok: true, amount: BAILOUT_AMOUNT, balance: u.balance };
}

function recordSpin(id, bet, win, game = "any") {
  const u = getUser(id);
  u.spins += 1;
  u.totalBet += bet;
  u.totalWon += win;
  if (win > u.biggestWin) u.biggestWin = win;
  addWeekly(id, win - bet);
  const keys = ["play_any", `play_${game}`];
  if (win > 0) keys.push("win_any", `win_${game}`);
  questEvent(id, keys, 1, false);
  save();
}

// ── 일일 퀘스트 ───────────────────────────────────────────────────
const QUESTS = [
  { id: "any3", label: "아무 게임 3판 하기", key: "play_any", target: 3, reward: 150 },
  { id: "any7", label: "아무 게임 7판 하기", key: "play_any", target: 7, reward: 300 },
  { id: "win3", label: "아무 게임 3번 당첨", key: "win_any", target: 3, reward: 250 },
  { id: "slot3", label: "슬롯 3판 돌리기", key: "play_slot", target: 3, reward: 200 },
  { id: "tumble3", label: "텀블 3판 돌리기", key: "play_tumble", target: 3, reward: 200 },
  { id: "bj1", label: "블랙잭 1승", key: "win_blackjack", target: 1, reward: 200 },
  { id: "rl1", label: "룰렛 1번 적중", key: "win_roulette", target: 1, reward: 200 },
  { id: "crash1", label: "크래시 캐시아웃 1회", key: "win_crash", target: 1, reward: 200 },
  { id: "race1", label: "경마 1회 참가", key: "play_race", target: 1, reward: 150 },
  { id: "mine2", label: "광산에서 2번 캐기", key: "play_mine", target: 2, reward: 150 },
];
const QUEST_ALL_BONUS = 300;

function questDayKey() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 기준 날짜
}
// 날짜 시드로 매일 3개 선정 (모든 유저 공통)
function todaysQuests() {
  const day = questDayKey();
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...QUESTS];
  const picked = [];
  for (let i = 0; i < 3; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    picked.push(pool.splice(h % pool.length, 1)[0]);
  }
  return picked;
}
function questState(id) {
  const u = getUser(id);
  const day = questDayKey();
  if (!u.quests || u.quests.day !== day) u.quests = { day, progress: {}, claimed: [] };
  return u.quests;
}
// keys 에 해당하는 오늘의 퀘스트 진행도 누적
function questEvent(id, keys, n = 1, doSave = true) {
  const qs = questState(id);
  let touched = false;
  for (const q of todaysQuests()) {
    if (!keys.includes(q.key)) continue;
    qs.progress[q.id] = Math.min(q.target, (qs.progress[q.id] || 0) + n);
    touched = true;
  }
  if (touched && doSave) save();
}
// 오늘 퀘스트 현황
function questBoard(id) {
  const qs = questState(id);
  return todaysQuests().map((q) => ({
    ...q,
    progress: qs.progress[q.id] || 0,
    done: (qs.progress[q.id] || 0) >= q.target,
    claimed: qs.claimed.includes(q.id),
  }));
}
// 완료한 퀘스트 보상 수령 (3개 전부 완료 시 보너스 +300)
function claimQuests(id, name) {
  const u = getUser(id, name);
  const qs = questState(id);
  const board = questBoard(id);
  const claimables = board.filter((q) => q.done && !q.claimed);
  if (!claimables.length) return { ok: false, board };
  let total = 0;
  for (const q of claimables) {
    qs.claimed.push(q.id);
    total += q.reward;
  }
  let allBonus = 0;
  if (board.every((q) => q.done) && !qs.claimed.includes("__all__")) {
    qs.claimed.push("__all__");
    allBonus = QUEST_ALL_BONUS;
    total += allBonus;
  }
  u.balance += total;
  save();
  return { ok: true, total, allBonus, claimed: claimables, balance: u.balance, board: questBoard(id) };
}

// ── 송금 ──────────────────────────────────────────────────────────
function transfer(fromId, toId, amount, toName) {
  amount = Math.floor(amount);
  if (amount < 1) return { ok: false, reason: "min" };
  const from = getUser(fromId);
  if (from.balance < amount) return { ok: false, reason: "balance", balance: from.balance };
  const to = getUser(toId, toName);
  from.balance -= amount;
  to.balance += amount;
  save();
  return { ok: true, fromBalance: from.balance, toBalance: to.balance };
}

// ── 잭팟 풀: 모든 베팅의 1%가 쌓이고, 슬롯 777에서 전액 지급 ───────
function meta() {
  if (!data.__meta) data.__meta = { jackpot: 0 };
  return data.__meta;
}
function feedJackpot(bet) {
  const m = meta();
  m.jackpot += Math.max(0, Math.floor(bet * 0.01));
  save();
  return m.jackpot;
}
function jackpotAmount() { return meta().jackpot || 0; }
function claimJackpot(id) {
  const m = meta();
  const amt = m.jackpot || 0;
  m.jackpot = 0;
  if (amt > 0) addBalance(id, amt);
  save();
  return amt;
}

// ── 주간 순익 집계 (ISO 주 기준 자동 리셋) ────────────────────────
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${w}`;
}
function addWeekly(id, net) {
  const m = meta();
  const wk = weekKey();
  if (!m.weekly || m.weekly.key !== wk) m.weekly = { key: wk, net: {} };
  m.weekly.net[id] = (m.weekly.net[id] || 0) + net;
}
// ── 노가다 (광산 캐기, 5분 쿨) ────────────────────────────────────
const GRIND_CD = 5 * 60 * 1000;
function grindReady(id) {
  const u = getUser(id);
  const remaining = GRIND_CD - (Date.now() - (u.lastGrind || 0));
  return remaining <= 0 ? { ok: true } : { ok: false, remaining };
}
function grindCommit(id, name, coins) {
  const u = getUser(id, name);
  u.lastGrind = Date.now();
  u.balance += Math.max(0, Math.floor(coins));
  save();
  return u.balance;
}

function weeklyBoard(limit = 10) {
  const m = meta();
  const wk = weekKey();
  if (!m.weekly || m.weekly.key !== wk) return { key: wk, rows: [] };
  const rows = Object.entries(m.weekly.net)
    .map(([id, net]) => ({ id, name: data[id]?.name || "?", net }))
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);
  return { key: wk, rows };
}

function leaderboard(limit = 10) {
  return Object.entries(data)
    .map(([id, u]) => ({ id, name: u.name, balance: u.balance }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

module.exports = {
  START_BALANCE,
  DAILY_AMOUNT,
  BAILOUT_AMOUNT,
  getUser,
  addBalance,
  claimDaily,
  claimBailout,
  recordSpin,
  leaderboard,
  transfer,
  feedJackpot,
  jackpotAmount,
  claimJackpot,
  weeklyBoard,
  grindReady,
  grindCommit,
  questBoard,
  claimQuests,
  questEvent,
};
