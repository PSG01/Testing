// ── 등반(슬더슬형 덱빌딩 로그라이크) 엔진 ─────────────────────────
// 메커니즘: 에너지/드로우, 블록, 힘(STR), 독(POISON), 약화(WEAK x0.75), 취약(VULN x1.5), 소멸(EXHAUST)

// ── 카드 풀 (26종) ────────────────────────────────────────────────
// kind: attack|skill / 효과는 effects 배열로 조합
// fx: slash|heavy|double|fire|poison|shield|buff|heal|draw|energy|spikes|execute
const CARDS = {
  // 기본
  strike:   { name: "타격",     cost: 1, kind: "attack", dmg: 6,  desc: "피해를 6 줍니다", fx: "slash" },
  defend:   { name: "수비",     cost: 1, kind: "skill",  block: 5, desc: "방어도 5를 얻습니다", fx: "shield" },
  // 공격
  twin:     { name: "쌍격",     cost: 1, kind: "attack", dmg: 4, hits: 2, desc: "피해 4를 2번 줍니다", fx: "double", cls: "rogue" },
  bash:     { name: "강타",     cost: 2, kind: "attack", dmg: 10, vuln: 2, desc: "피해 10, 취약 2 부여", fx: "heavy", cls: "warrior" },
  headblow: { name: "머리치기", cost: 1, kind: "attack", dmg: 8, weak: 1, desc: "피해 8, 약화 1 부여", fx: "slash", cls: "warrior" },
  poisonstab:{name: "독칼",     cost: 1, kind: "attack", dmg: 5, poison: 3, desc: "피해 5, 독 3 부여", fx: "poison", cls: "rogue" },
  fury:     { name: "분노",     cost: 0, kind: "attack", dmg: 4, desc: "피해 4 (비용 없음)", fx: "slash", cls: "rogue" },
  execute:  { name: "처형",     cost: 2, kind: "attack", dmg: 20, exhaust: true, desc: "피해 20 · 소멸", fx: "execute" },
  drain:    { name: "흡혈",     cost: 2, kind: "attack", dmg: 9, heal: 9, exhaust: true, desc: "피해 9, 체력 9 회복 · 소멸", fx: "execute", cls: "mage" },
  heavy:    { name: "대검휘두르기", cost: 2, kind: "attack", dmg: 14, desc: "피해 14", fx: "heavy", cls: "warrior" },
  comboFin: { name: "마무리일격", cost: 1, kind: "attack", dmgPerStr: 4, dmg: 4, desc: "피해 4 + 힘x4", fx: "heavy", cls: "warrior" },
  // 스킬
  ironwall: { name: "철벽",     cost: 2, kind: "skill", block: 12, desc: "방어도 12를 얻습니다", fx: "shield", cls: "warrior" },
  crouch:   { name: "웅크리기", cost: 1, kind: "skill", block: 9, exhaust: true, desc: "방어도 9 · 소멸", fx: "shield" },
  prepare:  { name: "전투준비", cost: 0, kind: "skill", block: 3, draw: 1, desc: "방어도 3, 카드 1장 뽑기", fx: "draw", cls: "rogue" },
  breathe:  { name: "심호흡",   cost: 1, kind: "skill", draw: 2, desc: "카드를 2장 뽑습니다", fx: "draw", cls: "rogue" },
  flex:     { name: "힘모으기", cost: 1, kind: "skill", str: 2, desc: "힘을 2 얻습니다", fx: "buff", cls: "warrior" },
  train:    { name: "단련",     cost: 2, kind: "skill", str: 3, exhaust: true, desc: "힘 3 · 소멸", fx: "buff", cls: "warrior" },
  vial:     { name: "독병",     cost: 1, kind: "skill", poison: 5, desc: "독 5를 부여합니다", fx: "poison", cls: "rogue" },
  toxin:    { name: "맹독",     cost: 2, kind: "skill", poison: 9, exhaust: true, desc: "독 9 부여 · 소멸", fx: "poison", cls: "rogue" },
  regroup:  { name: "재정비",   cost: 1, kind: "skill", block: 5, draw: 1, desc: "방어도 5, 카드 1장 뽑기", fx: "draw" },
  adren:    { name: "아드레날린", cost: 0, kind: "skill", energy: 1, draw: 1, exhaust: true, desc: "에너지 1, 뽑기 1 · 소멸", fx: "energy", cls: "mage" },
  shieldbash:{name: "방패치기", cost: 1, kind: "attack", dmgFromBlock: true, dmg: 0, desc: "현재 방어도만큼 피해", fx: "heavy", cls: "warrior" },
  weakall:  { name: "위협",     cost: 0, kind: "skill", weak: 1, exhaust: true, desc: "약화 1 부여 · 소멸", fx: "buff" },
  bigheal:  { name: "응급처치", cost: 1, kind: "skill", heal: 7, exhaust: true, desc: "체력 7 회복 · 소멸", fx: "heal" },
  spikes:   { name: "가시갑옷", cost: 1, kind: "skill", block: 4, thorns: 2, desc: "방어도 4, 가시 2", fx: "spikes" },
  openwound:{ name: "상처내기", cost: 1, kind: "attack", dmg: 7, poison: 2, desc: "피해 7, 독 2 부여", fx: "poison", cls: "rogue" },
  fireball: { name: "화염구",   cost: 1, kind: "attack", dmg: 8, desc: "피해를 8 줍니다", fx: "fire", cls: "mage" },
  flamewave:{ name: "화염파",   cost: 2, kind: "attack", dmg: 13, vuln: 1, desc: "피해 13, 취약 1 부여", fx: "fire", cls: "mage" },
  manaburst:{ name: "마나폭발", cost: 0, kind: "attack", dmg: 6, exhaust: true, desc: "피해 6 · 소멸", fx: "fire", cls: "mage" },
  meditate: { name: "명상",     cost: 1, kind: "skill", energy: 1, block: 3, desc: "에너지 1, 방어도 3", fx: "energy", cls: "mage" },
};
// ── 카드 강화 ("key+" = 강화판) ───────────────────────────────────
const CHARS = {
  warrior: { name: "전사", px: "warrior", emoji: "⚔️", hp: 82,
    starter: ["strike","strike","strike","strike","strike","defend","defend","defend","defend","bash"],
    passive: "전투 시작 시 방어도 5", desc: "단단하게 버티며 힘을 키우는 정통파" },
  rogue:   { name: "도적", px: "rogue", emoji: "🗡️", hp: 70,
    starter: ["strike","strike","strike","strike","defend","defend","defend","poisonstab","fury","prepare"],
    passive: "매 턴 드로우 6장", desc: "독과 0코스트 연계로 몰아치는 속공형" },
  mage:    { name: "마법사", px: "mage", emoji: "🔮", hp: 64,
    starter: ["strike","strike","strike","defend","defend","defend","fireball","fireball","adren","meditate"],
    passive: "전투 시작 시 에너지 +1", desc: "화염과 에너지 가속의 한 방 캐스터" },
};
const shuffleArr = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const REWARD_POOL = Object.keys(CARDS).filter((k) => !["strike", "defend"].includes(k));
function rewardPicksFor(charKey) {
  const own = REWARD_POOL.filter((k) => CARDS[k].cls === charKey);
  const neutral = REWARD_POOL.filter((k) => !CARDS[k].cls);
  const pool = shuffleArr([...own, ...own, ...neutral]);
  const picks = [];
  for (const k of pool) { if (!picks.includes(k)) picks.push(k); if (picks.length === 3) break; }
  return picks;
}

function describe(c) {
  const p = [];
  if (c.dmgFromBlock) p.push("현재 방어도만큼 피해");
  else if (c.dmgPerStr) p.push(`피해 ${c.dmg} + 힘x${c.dmgPerStr}`);
  else if (c.dmg) p.push(c.hits > 1 ? `피해 ${c.dmg}를 ${c.hits}번` : `피해 ${c.dmg}`);
  if (c.block) p.push(`방어도 ${c.block}`);
  if (c.str) p.push(`힘 ${c.str}`);
  if (c.poison) p.push(`독 ${c.poison} 부여`);
  if (c.vuln) p.push(`취약 ${c.vuln}`);
  if (c.weak) p.push(`약화 ${c.weak}`);
  if (c.heal) p.push(`체력 ${c.heal} 회복`);
  if (c.draw) p.push(`카드 ${c.draw}장 뽑기`);
  if (c.energy) p.push(`에너지 ${c.energy}`);
  if (c.thorns) p.push(`가시 ${c.thorns}`);
  let d = p.join(", ");
  if (c.exhaust) d += " · 소멸";
  return d;
}
function getCard(key) {
  if (!key.endsWith("+")) return CARDS[key];
  const base = CARDS[key.slice(0, -1)];
  if (!base) return null;
  const up = { ...base, name: base.name + "+", upgraded: true };
  if (up.dmg) up.dmg += 3;
  if (up.block) up.block += 3;
  if (up.poison) up.poison += 2;
  if (up.str) up.str += 1;
  if (up.heal) up.heal += 4;
  if (up.draw) up.draw += 1;
  if (up.thorns) up.thorns += 1;
  if (up.vuln) up.vuln += 1;
  if (up.weak) up.weak += 1;
  if (up.dmgPerStr) up.dmgPerStr += 1;
  up.desc = describe(up);
  return up;
}
function upgradeCard(run, key) {
  const i = run.deck.indexOf(key);
  if (i < 0) return false;
  run.deck[i] = key + "+";
  return true;
}

// ── 유물 ──────────────────────────────────────────────────────────
const RELICS = {
  whetstone: { name: "날카로운 숫돌", emoji: "🔪", desc: "공격 카드 피해 +1" },
  ironheart: { name: "강철 심장",   emoji: "🛡️", desc: "전투 시작 시 방어도 +4" },
  ember:     { name: "타오르는 불씨", emoji: "🔥", desc: "전투 시작 시 힘 +1" },
  fang:      { name: "독사 송곳니", emoji: "🐍", desc: "독 부여 +1" },
  core:      { name: "에너지 코어", emoji: "💠", desc: "전투 시작 시 에너지 +1" },
  drum:      { name: "전투의 북",   emoji: "🥁", desc: "전투 시작 시 카드 1장 추가로 뽑기" },
  mushroom:  { name: "수상한 버섯", emoji: "🍄", desc: "획득 시 최대 체력 +8" },
  pendant:   { name: "회복 목걸이", emoji: "📿", desc: "전투 승리 시 체력 4 회복" },
  thorncharm:{ name: "가시 부적",   emoji: "🌵", desc: "전투 시작 시 가시 1" },
  luckcoin:  { name: "행운의 동전", emoji: "🪙", desc: "코인 보상 +25%" },
};
function grantRelic(run) {
  const owned = new Set(run.relics || []);
  const pool = Object.keys(RELICS).filter((k) => !owned.has(k));
  if (!pool.length) return null;
  const k = pool[Math.floor(Math.random() * pool.length)];
  run.relics = run.relics || [];
  run.relics.push(k);
  if (k === "mushroom") { run.maxHp += 8; run.hp += 8; }
  return k;
}
const hasRelic = (run, k) => (run.relics || []).includes(k);

// ── 적 (의도 패턴) ────────────────────────────────────────────────
// intent: {kind:'attack',dmg}|{kind:'block',block}|{kind:'buff',str}|{kind:'debuff',weak}
const ENEMIES = {
  slime:    { name: "슬라임",   px: "slime",    hp: 42, pattern: (t) => t % 3 === 2 ? { kind: "block", block: 6 } : { kind: "attack", dmg: 8 + (t % 2) * 2 } },
  bat:      { name: "동굴박쥐", px: "bat",      hp: 36, pattern: (t) => t % 3 === 1 ? { kind: "debuff", weak: 2 } : { kind: "attack", dmg: 9 } },
  goblin:   { name: "고블린",   px: "goblin",   hp: 48, pattern: (t) => t % 2 === 0 ? { kind: "attack", dmg: 11 } : { kind: "block", block: 8 } },
  skeleton: { name: "해골병사", px: "skeleton", hp: 52, pattern: (t) => t % 3 === 2 ? { kind: "buff", str: 2 } : { kind: "attack", dmg: 10 } },
  orc:      { name: "오크전사 (엘리트)", px: "orc", hp: 72, elite: true, pattern: (t) => [{ kind: "attack", dmg: 14 }, { kind: "block", block: 10 }, { kind: "attack", dmg: 18 }][t % 3] },
  dragon:   { name: "어둠의 드래곤 (보스)", px: "dragon", hp: 105, boss: true, pattern: (t) => [{ kind: "buff", str: 2 }, { kind: "attack", dmg: 11 }, { kind: "block", block: 9 }, { kind: "attack", dmg: 19 }][t % 4] },
};

// ── 맵 (10층) ─────────────────────────────────────────────────────
// 각 층 종류: battle / elite / rest / boss
function buildMap() {
  const floors = ["battle", "battle", "rest", "battle", "elite", "battle", "rest", "battle", "battle", "boss"];
  return floors;
}
function enemyFor(type, floor) {
  if (type === "boss") return spawn("dragon", floor);
  if (type === "elite") return spawn("orc", floor);
  const keys = ["slime", "bat", "goblin", "skeleton"];
  return spawn(keys[Math.min(keys.length - 1, Math.floor(Math.random() * Math.min(keys.length, 1 + Math.floor(floor / 2))))], floor);
}
function spawn(key, floor) {
  const e = ENEMIES[key];
  const scale = 1 + Math.max(0, floor - 1) * 0.045;
  return { key, px: e.px, name: e.name, maxHp: Math.floor(e.hp * scale), hp: Math.floor(e.hp * scale),
    block: 0, str: 0, poison: 0, weak: 0, vuln: 0, turn: 0, pattern: e.pattern, boss: !!e.boss, elite: !!e.elite };
}

// ── 런/전투 상태 ──────────────────────────────────────────────────
function newRun(userId, charKey = "warrior") {
  const ch = CHARS[charKey] || CHARS.warrior;
  return {
    userId, charKey, floor: 0, map: buildMap(),
    maxHp: ch.hp, hp: ch.hp, deck: [...ch.starter], relics: [],
    inBattle: false, battle: null, gold: 0,
  };
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function startBattle(run, enemy) {
  run.inBattle = true;
  run.battle = {
    enemy, energy: 3, maxEnergy: 3,
    draw: shuffle([...run.deck]), hand: [], discard: [], exhausted: [],
    block: 0, str: 0, thorns: 0, weak: 0, turn: 0,
    intent: enemy.pattern(0),
  };
  // 캐릭터 패시브 + 유물
  if (run.charKey === "warrior") run.battle.block = 5;
  if (run.charKey === "mage") run.battle.energy += 1;
  if (hasRelic(run, "ironheart")) run.battle.block += 4;
  if (hasRelic(run, "ember")) run.battle.str += 1;
  if (hasRelic(run, "core")) run.battle.energy += 1;
  if (hasRelic(run, "thorncharm")) run.battle.thorns += 1;
  run.battle.drawN = run.charKey === "rogue" ? 6 : 5;
  drawCards(run.battle, run.battle.drawN + (hasRelic(run, "drum") ? 1 : 0));
  return run.battle;
}
function drawCards(b, n) {
  for (let i = 0; i < n; i++) {
    if (b.draw.length === 0) { b.draw = shuffle(b.discard); b.discard = []; }
    if (b.draw.length === 0) break;
    if (b.hand.length >= 8) break;
    b.hand.push(b.draw.pop());
  }
}

const vulnMult = (vuln) => (vuln > 0 ? 1.5 : 1);
const weakMult = (weak) => (weak > 0 ? 0.75 : 1);

// 카드 사용 → 이벤트 목록 반환 (렌더용)
function playCard(run, idx) {
  const b = run.battle, e = b.enemy;
  const key = b.hand[idx];
  const c = getCard(key);
  if (!c || b.energy < c.cost) return null;
  b.energy -= c.cost;
  b.hand.splice(idx, 1);
  (c.exhaust ? b.exhausted : b.discard).push(key);

  const ev = { card: key, name: c.name, kind: c.kind, effects: [] };
  if (c.kind === "attack") {
    const hits = c.hits || 1;
    let base = (c.dmg || 0) + b.str * (c.dmgPerStr ? c.dmgPerStr : 1) - (c.dmgPerStr ? b.str : 0);
    if (hasRelic(run, "whetstone")) base += 1;
    if (c.dmgFromBlock) base = b.block;
    let total = 0;
    for (let h = 0; h < hits; h++) {
      let dmg = Math.floor(base * weakMult(b.weak) * vulnMult(e.vuln));
      const absorbed = Math.min(e.block, dmg);
      e.block -= absorbed; dmg -= absorbed;
      e.hp -= dmg; total += dmg + absorbed;
    }
    ev.effects.push({ t: "dmg", n: total });

  }
  if (c.block) { b.block += c.block; ev.effects.push({ t: "block", n: c.block }); }
  if (c.str) { b.str += c.str; ev.effects.push({ t: "str", n: c.str }); }
  if (c.poison) { e.poison += c.poison + (hasRelic(run, "fang") ? 1 : 0); ev.effects.push({ t: "poison", n: c.poison }); }
  if (c.vuln) { e.vuln += c.vuln; ev.effects.push({ t: "vuln", n: c.vuln }); }
  if (c.weak) { e.weak += c.weak; ev.effects.push({ t: "weak", n: c.weak }); }
  if (c.heal) { run.hp = Math.min(run.maxHp, run.hp + c.heal); ev.effects.push({ t: "heal", n: c.heal }); }
  if (c.draw) { drawCards(b, c.draw); ev.effects.push({ t: "draw", n: c.draw }); }
  if (c.energy) { b.energy += c.energy; ev.effects.push({ t: "energy", n: c.energy }); }
  if (c.thorns) { b.thorns += c.thorns; ev.effects.push({ t: "thorns", n: c.thorns }); }
  return ev;
}

// 턴 종료 → 적 행동 → 새 턴 준비. 이벤트 반환
function endTurn(run) {
  const b = run.battle, e = b.enemy;
  const events = [];

  // 적: 독 피해 (턴 시작)
  if (e.poison > 0) { e.hp -= e.poison; events.push({ t: "epoison", n: e.poison }); e.poison--; }
  if (e.hp <= 0) return { events, enemyDead: true };

  // 적 행동 (의도 실행)
  const it = b.intent;
  if (it.kind === "attack") {
    let dmg = Math.floor(it.dmg * (1 + e.str * 0.1) * weakMult(e.weak) * vulnMult(0));
    if (e.weak > 0) e.weak--;
    const absorbed = Math.min(b.block, dmg);
    b.block -= absorbed;
    const taken = dmg - absorbed;
    run.hp -= taken;
    events.push({ t: "eattack", n: taken, blocked: absorbed });
    if (b.thorns > 0 && taken + absorbed > 0) { e.hp -= b.thorns; events.push({ t: "thornsHit", n: b.thorns }); }
  } else if (it.kind === "block") { e.block += it.block; events.push({ t: "eblock", n: it.block }); }
  else if (it.kind === "buff") { e.str += it.str; events.push({ t: "ebuff", n: it.str }); }
  else if (it.kind === "debuff") { b.weak += it.weak; events.push({ t: "edebuff", n: it.weak }); }

  if (e.hp <= 0) return { events, enemyDead: true };
  if (run.hp <= 0) return { events, playerDead: true };

  // 새 턴: 손패 버림 → 드로우5, 에너지/블록 리셋, 의도 갱신, 취약 감소
  b.discard.push(...b.hand); b.hand = [];
  drawCards(b, b.drawN || 5);
  b.energy = b.maxEnergy;
  if (b.runCharKey === "mage") b.energy += 0;
  b.block = 0;
  if (e.vuln > 0) e.vuln--;
  if (b.weak > 0) b.weak--; // 내 약화도 턴마다 1 감소
  e.turn++; b.turn++;
  b.intent = e.pattern(e.turn);
  return { events, next: true };
}

// 전투 보상
function battleReward(run, enemy) {
  let coins = Math.floor((30 + run.floor * 8) * (enemy.boss ? 4 : enemy.elite ? 2 : 1) * (0.85 + Math.random() * 0.3));
  if (hasRelic(run, "luckcoin")) coins = Math.floor(coins * 1.25);
  if (hasRelic(run, "pendant")) run.hp = Math.min(run.maxHp, run.hp + 4);
  const picks = rewardPicksFor(run.charKey);
  // 유물: 엘리트 100%, 일반 전투 10% (grantRelic이 run.relics에 추가 + 버섯 즉시 적용)
  let relic = null;
  if (enemy.elite || (!enemy.boss && Math.random() < 0.10)) relic = grantRelic(run);
  return { coins, picks, relic };
}


function rebindEnemy(enemy) { if (enemy && !enemy.pattern && ENEMIES[enemy.key]) enemy.pattern = ENEMIES[enemy.key].pattern; return enemy; }

module.exports = { CARDS, RELICS, CHARS, ENEMIES, getCard, upgradeCard, grantRelic, rebindEnemy, newRun, buildMap, enemyFor, startBattle, playCard, endTurn, drawCards, battleReward };
