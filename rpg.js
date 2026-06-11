// ── 던전 RPG 코어 (1단계: 직업/전투/레벨/노가다) ──────────────────
const fs = require("node:fs");
const path = require("node:path");
const FILE = path.join(__dirname, "data", "rpg.json");

let data = (() => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } })();
function save() { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data)); }

// ── 직업 6종 ──────────────────────────────────────────────────────
const CLASSES = {
  warrior:  { name: "전사",   emoji: "⚔️", hp: 120, mp: 30, atk: 16, def: 10, crit: 0.08, skill: { name: "강타",     mp: 10, mult: 1.9, desc: "강력한 일격" } },
  berserker:{ name: "버서커", emoji: "🪓", hp: 140, mp: 20, atk: 21, def: 5,  crit: 0.12, skill: { name: "광란",     mp: 10, mult: 2.3, desc: "자신도 다치는 맹공(반동 10%)", recoil: 0.1 } },
  mage:     { name: "마법사", emoji: "🔮", hp: 85,  mp: 60, atk: 11, def: 6,  crit: 0.06, skill: { name: "파이어볼", mp: 12, mult: 2.6, desc: "방어 무시 마법", pierce: true } },
  rogue:    { name: "도적",   emoji: "🗡️", hp: 95,  mp: 35, atk: 14, def: 7,  crit: 0.25, skill: { name: "급소찌르기", mp: 10, mult: 1.7, desc: "크리티컬 확률 2배", critBoost: 2 } },
  archer:   { name: "궁수",   emoji: "🏹", hp: 100, mp: 35, atk: 15, def: 7,  crit: 0.18, skill: { name: "관통사격", mp: 10, mult: 1.8, desc: "방어 무시", pierce: true } },
  priest:   { name: "사제",   emoji: "✨", hp: 105, mp: 55, atk: 12, def: 9,  crit: 0.06, skill: { name: "힐",       mp: 12, heal: 0.4, desc: "최대 HP의 40% 회복" } },
};

// ── 몬스터 (층 비례 스케일, 5층마다 보스) ─────────────────────────
const MOBS = [
  { key: "slime",    name: "슬라임",   hp: 40,  atk: 8,  def: 2 },
  { key: "bat",      name: "동굴박쥐", hp: 35,  atk: 11, def: 1 },
  { key: "goblin",   name: "고블린",   hp: 55,  atk: 10, def: 4 },
  { key: "skeleton", name: "해골병사", hp: 60,  atk: 13, def: 5 },
  { key: "orc",      name: "오크전사", hp: 80,  atk: 15, def: 7 },
];
const BOSS = { key: "dragon", name: "어둠의 드래곤", hp: 160, atk: 20, def: 9 };

function monsterFor(floor) {
  const isBoss = floor % 5 === 0;
  const base = isBoss ? BOSS : MOBS[Math.min(MOBS.length - 1, Math.floor(Math.random() * Math.min(MOBS.length, 1 + Math.floor(floor / 2))))];
  const s = 1 + (floor - 1) * 0.18;
  return {
    key: base.key, isBoss,
    name: isBoss ? `${base.name} (보스)` : base.name,
    maxHp: Math.floor(base.hp * s), hp: Math.floor(base.hp * s),
    atk: Math.floor(base.atk * s), def: Math.floor(base.def * s),
  };
}

// ── 캐릭터 ────────────────────────────────────────────────────────
function getChar(id) { return data[id] || null; }
function createChar(id, name, classKey) {
  const c = CLASSES[classKey];
  if (!c) return null;
  data[id] = { name, classKey, level: 1, exp: 0, potions: 3, bestFloor: 0, lastGrind: 0, runs: 0, kills: 0 };
  save();
  return data[id];
}
function statsOf(ch) {
  const c = CLASSES[ch.classKey];
  const lv = ch.level - 1;
  return {
    maxHp: c.hp + lv * 14, maxMp: c.mp + lv * 5,
    atk: c.atk + lv * 3, def: c.def + lv * 1.5,
    crit: c.crit, skill: c.skill, className: c.name, emoji: c.emoji,
  };
}
function expNeed(level) { return 40 + (level - 1) * 35; }
function gainExp(id, amount) {
  const ch = data[id];
  ch.exp += amount;
  let ups = 0;
  while (ch.exp >= expNeed(ch.level)) { ch.exp -= expNeed(ch.level); ch.level++; ups++; }
  save();
  return ups;
}

// ── 전투 계산 ─────────────────────────────────────────────────────
const vary = () => 0.85 + Math.random() * 0.3;
function attack(atk, def, { mult = 1, pierce = false, crit = 0, critBoost = 1 } = {}) {
  const isCrit = Math.random() < crit * critBoost;
  let dmg = atk * mult * vary() - (pierce ? 0 : def * 0.5);
  if (isCrit) dmg *= 1.7;
  return { dmg: Math.max(1, Math.floor(dmg)), crit: isCrit };
}

// 보상: 층 비례 코인 + 경험치, 가끔 물약
function rewardFor(floor, isBoss) {
  const coins = Math.floor((22 + floor * 9) * (isBoss ? 3 : 1) * vary());
  const exp = Math.floor((16 + floor * 6) * (isBoss ? 2.5 : 1));
  const potion = Math.random() < (isBoss ? 0.9 : 0.22) ? 1 : 0;
  return { coins, exp, potion };
}

// ── 노가다 (쿨타임 30분, 소량 코인) ───────────────────────────────
const GRIND_CD = 30 * 60 * 1000;
function grind(id) {
  const ch = data[id];
  if (!ch) return { ok: false, reason: "no_char" };
  const now = Date.now();
  if (now - ch.lastGrind < GRIND_CD) return { ok: false, reason: "cd", remaining: GRIND_CD - (now - ch.lastGrind) };
  ch.lastGrind = now;
  const coins = 60 + Math.floor(Math.random() * 60) + ch.level * 4; // 60~120 + 레벨 보너스
  save();
  return { ok: true, coins };
}

function recordRun(id, floor, kills) {
  const ch = data[id];
  ch.runs++; ch.kills += kills;
  if (floor > ch.bestFloor) ch.bestFloor = floor;
  save();
}
function addPotion(id, n) { data[id].potions = Math.max(0, (data[id].potions || 0) + n); save(); }

module.exports = { CLASSES, monsterFor, getChar, createChar, statsOf, expNeed, gainExp, attack, rewardFor, grind, recordRun, addPotion, GRIND_CD };
