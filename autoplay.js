// ── 자동재생(라디오) 설정 + 최근 재생 기록 ─────────────────────────
// 큐가 비면 마지막 곡 기반으로 비슷한 곡을 이어 트는 기능의 상태 저장소.
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "autoplay.json");
function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}
function persist(o) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(o));
}
const isOn = (guildId) => !!load()[guildId];
function toggle(guildId) {
  const o = load();
  o[guildId] = !o[guildId];
  persist(o);
  return o[guildId];
}

// 최근 재생한 곡 기록 (서버당 30곡) — 자동재생이 같은 곡을 반복하지 않게
const history = new Map();
function markPlayed(guildId, ident) {
  if (!ident) return;
  let arr = history.get(guildId);
  if (!arr) {
    arr = [];
    history.set(guildId, arr);
  }
  arr.push(ident);
  if (arr.length > 30) arr.shift();
}
const wasPlayed = (guildId, ident) => (history.get(guildId) || []).includes(ident);

module.exports = { isOn, toggle, markPlayed, wasPlayed };
