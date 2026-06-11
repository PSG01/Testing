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

function recordSpin(id, bet, win) {
  const u = getUser(id);
  u.spins += 1;
  u.totalBet += bet;
  u.totalWon += win;
  if (win > u.biggestWin) u.biggestWin = win;
  addWeekly(id, win - bet);
  save();
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
};
