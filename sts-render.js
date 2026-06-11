// ── 등반 전투 렌더러 (도트 + 의도/에너지/블록/손패) ───────────────
const px = require("./px-sprites");
const sprites = require("./sprite-assets");
const { CARDS, getCard } = require("./sts");
const { svgToPng, framesToGif, easeOutCubic } = require("./utils");

const W = 520, H = 400;
const PXS = 4; // 몬스터 픽셀 크기
const HPX = 2.9; // 영웅 픽셀 크기 (32x29 스프라이트 → 93x84)
const PXX = 78, PXY = 134; // 발이 218 그림자선에 닿게

function mobPos(key) {
  const sz = px.mobSize(key, PXS);
  return { x: 430 - sz.w, y: 214 - sz.h, w: sz.w, h: sz.h };
}

function background() {
  let s = `<rect width="${W}" height="${H}" fill="#241a36"/>`;
  const bw = 40, bh = 22;
  for (let r = 0; r < 9; r++) for (let c = -1; c < 14; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
    s += `<rect x="${x}" y="${y}" width="${bw - 3}" height="${bh - 3}" rx="2" fill="${r % 3 === 0 ? "#322648" : "#2b2040"}"/>`;
  }
  s += `<rect x="0" y="218" width="${W}" height="60" fill="#1c1428"/>`;
  for (let c = 0; c < 17; c++) s += `<rect x="${c * 32}" y="218" width="29" height="12" rx="2" fill="#251a34"/>`;
  for (const tx of [40, 478]) s += `<rect x="${tx - 3}" y="64" width="6" height="20" fill="#5a4632"/><polygon points="${tx},44 ${tx - 8},62 ${tx + 8},62" fill="#ff9d2e"/><polygon points="${tx},50 ${tx - 4},62 ${tx + 4},62" fill="#ffd23a"/>`;
  return s;
}

// 의도 아이콘 (적 머리 위) — 슬더슬 시그니처
// 의도 배지: 도트 아이콘 + 한글 라벨 (다음 턴에 적이 할 행동)
function miniSword(x, y) {
  let s = "";
  const pxr = (c, r, col) => `<rect x="${x + c * 3}" y="${y + r * 3}" width="3" height="3" fill="${col}"/>`;
  const M = "#e8eef8", G = "#caa84a";
  [[5,0],[4,1],[3,2],[2,3],[1,4]].forEach(([c,r]) => { s += pxr(c, r, M); s += pxr(c+1, r, M); });
  s += pxr(0,5,G) + pxr(1,5,G) + pxr(0,6,G);
  return `<g shape-rendering="crispEdges">${s}</g>`;
}
function miniShield(x, y) {
  let s = "";
  const pxr = (c, r, col) => `<rect x="${x + c * 3}" y="${y + r * 3}" width="3" height="3" fill="${col}"/>`;
  const B = "#5a9aff", L = "#9ac8ff";
  for (let c = 0; c < 6; c++) s += pxr(c, 0, B);
  for (let r = 1; r < 4; r++) { s += pxr(0, r, B); s += pxr(5, r, B); for (let c = 1; c < 5; c++) s += pxr(c, r, L); }
  s += pxr(1,4,B)+pxr(2,4,L)+pxr(3,4,L)+pxr(4,4,B)+pxr(2,5,B)+pxr(3,5,B);
  return `<g shape-rendering="crispEdges">${s}</g>`;
}
function miniArrow(x, y, up, col) {
  let s = "";
  const pxr = (c, r) => `<rect x="${x + c * 3}" y="${y + r * 3}" width="3" height="3" fill="${col}"/>`;
  if (up) { s += pxr(2,0)+pxr(3,0)+pxr(1,1)+pxr(4,1)+pxr(0,2)+pxr(5,2); for(let r=1;r<6;r++){s+=pxr(2,r)+pxr(3,r);} }
  else { for(let r=0;r<5;r++){s+=pxr(2,r)+pxr(3,r);} s += pxr(0,3)+pxr(5,3)+pxr(1,4)+pxr(4,4)+pxr(2,5)+pxr(3,5); }
  return `<g shape-rendering="crispEdges">${s}</g>`;
}
function intentIcon(x, y, intent, str) {
  if (!intent) return "";
  const badge = (w, inner, label, color) =>
    `<rect x="${x - w / 2}" y="${y - 34}" width="${w}" height="28" fill="#100c18"/>
     <rect x="${x - w / 2 + 2}" y="${y - 32}" width="${w - 4}" height="24" fill="none" stroke="#3a2a5a" stroke-width="2"/>
     ${inner}
     <text x="${x + 10}" y="${y - 13}" font-size="15" font-weight="bold" fill="${color}" text-anchor="middle" font-family="DejaVu Sans">${label}</text>`;
  if (intent.kind === "attack") {
    const dmg = Math.floor(intent.dmg * (1 + (str || 0) * 0.1));
    return badge(86, miniSword(x - 36, y - 30), `공격 ${dmg}`, "#ff8a98");
  }
  if (intent.kind === "block") return badge(86, miniShield(x - 36, y - 30), `방어 ${intent.block}`, "#7ab8ff");
  if (intent.kind === "buff") return badge(80, miniArrow(x - 34, y - 30, true, "#ffd23a"), `힘 +${intent.str}`, "#ffd23a");
  if (intent.kind === "debuff") return badge(86, miniArrow(x - 36, y - 30, false, "#b08aff"), `약화 ${intent.weak}`, "#b08aff");
  return "";
}
function bar(x, y, w, ratio, fg, label, value) {
  const r = Math.max(0, Math.min(1, ratio));
  return `<text x="${x}" y="${y - 5}" font-size="12" fill="#cfe8d4" font-family="DejaVu Sans">${label}</text>
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="14" fill="#100c18"/>
    <rect x="${x}" y="${y}" width="${Math.max(4, Math.floor(w * r / 4) * 4)}" height="10" fill="${fg}"/>
    <text x="${x + w}" y="${y - 5}" font-size="12" fill="#fff" text-anchor="end" font-family="DejaVu Sans">${value}</text>`;
}

// 상태 배지 (블록/힘/독/약화/취약)
function badges(x, y, list) {
  let s = "", i = 0;
  for (const [label, n, col] of list) {
    if (!n) continue;
    s += `<rect x="${x + i * 56}" y="${y}" width="52" height="20" fill="#100c18"/><text x="${x + i * 56 + 26}" y="${y + 15}" font-size="13" font-weight="bold" fill="${col}" text-anchor="middle" font-family="DejaVu Sans">${label}${n}</text>`;
    i++;
  }
  return s;
}

// 에너지 구슬
function energyOrb(x, y, cur, max) {
  return `<circle cx="${x}" cy="${y}" r="24" fill="#100c18"/><circle cx="${x}" cy="${y}" r="20" fill="#7a3cff"/><circle cx="${x - 7}" cy="${y - 7}" r="6" fill="#b08aff" opacity="0.7"/>
    <text x="${x}" y="${y + 7}" font-size="19" font-weight="bold" fill="#fff" text-anchor="middle" font-family="DejaVu Sans">${cur}/${max}</text>`;
}


// ── 카드 아이콘 (8x8 도트) ────────────────────────────────────────
const ICON = {
  slash: { pal: { W: "#e8eef8", G: "#caa84a", K: "#100c18" }, g: [
"......WK",".....WK.","....WK..","...WK...","..WK....",".WK.....","GG......","GG......"]},
  heavy: { pal: { W: "#e8eef8", G: "#caa84a", K: "#100c18" }, g: [
".....WWK","....WWK.","...WWK..","..WWK...",".WWK....","WWK.....","GGG.....",".G......"]},
  double: { pal: { W: "#e8eef8", K: "#100c18" }, g: [
"...W...W","..W...W.",".W...W..","W...W...","...W...W","..W...W.",".W...W..","W...W..."]},
  fire: { pal: { R: "#ff5a2e", O: "#ff9d2e", Y: "#ffd23a" }, g: [
"...R....","..RR.R..","..RRRR..",".RRORR..",".ROOORR.","ROOYOOR.","ROYYYOR.",".RRRRR.."]},
  poison: { pal: { G: "#5ad05a", D: "#2a7a2a", K: "#100c18" }, g: [
"...KK...","...KK...","..KGGK..",".KGGGGK.","KGGDGGGK","KGDGGDGK","KGGGGGGK",".KKKKKK."]},
  shield: { pal: { B: "#5a9aff", L: "#9ac8ff", K: "#100c18" }, g: [
"KKKKKKKK","KBLLLLBK","KBLBBLBK","KBLBBLBK",".KBLLBK.",".KBBBBK.","..KBBK..","...KK..."]},
  buff: { pal: { R: "#ff5a5a", Y: "#ffd23a" }, g: [
"...YY...","..YYYY..",".YYYYYY.","YY.YY.YY","...YY...","...YY...","...YY...","...YY..."]},
  heal: { pal: { G: "#5ad07a", W: "#d8ffe0" }, g: [
"...GG...","...GG...","...GG...","GGGWWGGG","GGGWWGGG","...GG...","...GG...","...GG..."]},
  draw: { pal: { W: "#e8eef8", B: "#5a9aff", K: "#100c18" }, g: [
".KKKK...",".KWWK...",".KWWKKK.",".KWWKWK.",".KWWKWK.",".KKKKWK.","...KWWK.","...KKKK."]},
  energy: { pal: { Y: "#ffd23a", O: "#ff9d2e" }, g: [
"....YY..","...YY...","..YY....",".YYYYY..","...YY...","..YY....",".YY.....","YY......"]},
  spikes: { pal: { G: "#8aff8a", D: "#2a7a2a" }, g: [
"D..D..D.","DG.DG.DG","DG.DG.DG","DGGDGGDG","DGGDGGDG",".GGGGGG.",".GGGGGG.","........"]},
  execute: { pal: { R: "#ff3a4a", K: "#100c18" }, g: [
"RK....KR",".RK..KR.","..RKKR..","...RR...","...RR...","..RKKR..",".RK..KR.","RK....KR"]},
};
function cardIcon(fx, x, y, s) {
  const ic = ICON[fx] || ICON.slash;
  return `<g shape-rendering="crispEdges">${px.drawGrid(ic.g, ic.pal, x, y, s)}</g>`;
}
// 손패 카드 (이미지 하단) — 손패가 많으면 카드 크기를 줄여 화면 안에 전부 표시
function handCards(hand, energy) {
  const n = hand.length;
  if (!n) return "";
  let cw = 86, ch = 104, gap = 8;
  let total = n * cw + (n - 1) * gap;
  const maxW = W - 16;
  if (total > maxW) {
    const k = maxW / total;
    cw = Math.floor(cw * k);
    gap = Math.max(3, Math.floor(gap * k));
    total = n * cw + (n - 1) * gap;
  }
  const x0 = (W - total) / 2;
  let s = "";
  hand.forEach((key, i) => {
    const c = getCard(key);
    const x = x0 + i * (cw + gap), y = H - ch - 12;
    const ok = energy >= c.cost;
    const col = c.kind === "attack" ? "#7a2030" : "#1f4a6a";
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${ok ? col : "#2a2a34"}" stroke="${ok ? "#caa84a" : "#444"}" stroke-width="2"/>
      <circle cx="${x + 13}" cy="${y + 13}" r="11" fill="#7a3cff" stroke="#100c18" stroke-width="2"/>
      <text x="${x + 13}" y="${y + 18}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle" font-family="DejaVu Sans">${c.cost}</text>
      <text x="${x + cw / 2 + 6}" y="${y + 19}" font-size="12" font-weight="bold" fill="${ok ? "#ffe9a8" : "#888"}" text-anchor="middle" font-family="DejaVu Sans">${c.name}</text>
      <rect x="${x + cw - 18}" y="${y + ch - 18}" width="16" height="16" fill="#100c18"/>
      <text x="${x + cw - 10}" y="${y + ch - 6}" font-size="11" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">${i + 1}</text>`;
    s += cardIcon(c.fx || (c.kind === "attack" ? "slash" : "shield"), x + cw / 2 - 14, y + 26, 3.5);
    if (!ok) s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="#000" opacity="0.35"/>`;
    // 설명 줄바꿈(짧게 2줄)
    const words = c.desc.split(" ");
    const lines = [""];
    for (const w2 of words) {
      if ((lines[lines.length - 1] + w2).length <= 9 || lines[lines.length - 1] === "") lines[lines.length - 1] += (lines[lines.length - 1] ? " " : "") + w2;
      else if (lines.length < 3) lines.push(w2);
    }
    lines.forEach((ln, li) => {
      s += `<text x="${x + cw / 2}" y="${y + 70 + li * 12}" font-size="10" fill="${ok ? "#dfe6f0" : "#777"}" text-anchor="middle" font-family="DejaVu Sans">${ln}</text>`;
    });
  });
  return s;
}

function shell(body, run, msg, msgColor = "#ffe9a8", shake = 0) {
  const dx = shake ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${dx},0)">${background()}${body}</g>
    <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#100c18" stroke-width="6"/>
    <rect x="10" y="10" width="120" height="26" fill="#100c18"/>
    <text x="70" y="29" font-size="15" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">${run.floor + 1}/10층</text>
    <rect x="${W / 2 - 120}" y="${H - 138}" width="240" height="20" fill="#100c18"/>
    <text x="${W / 2}" y="${H - 123}" font-size="13" fill="${msgColor}" text-anchor="middle" font-family="DejaVu Sans">${msg}</text>
  </svg>`;
}

// b: run.battle / opts: pdx, pose, pWhite, mWhite, shake, fx, msg
function scene(run, { pdx = 0, mdx = 0, pose = "idle", pWhite = false, mWhite = false, shake = 0, fx = "", msg = "", msgColor, hideHand = false } = {}) {
  const b = run.battle, e = b.enemy;
  const mp = mobPos(e.px);
  let s = "";
  s += bar(16, 58, 140, run.hp / run.maxHp, "#3ad07a", "HP", `${Math.max(0, run.hp)}/${run.maxHp}`);
  s += badges(16, 70, [["방어", b.block, "#7ab8ff"], ["힘", b.str, "#ffd23a"], ["약화", b.weak, "#b08aff"], ["가시", b.thorns, "#8aff8a"]]);
  s += bar(mp.x - 40, 58, 160, e.hp / e.maxHp, e.boss ? "#ff5470" : "#ff9d3a", e.name, `${Math.max(0, e.hp)}`);
  s += badges(mp.x - 40, 70, [["방어", e.block, "#7ab8ff"], ["힘", e.str, "#ffd23a"], ["독", e.poison, "#8aff8a"], ["취약", e.vuln, "#ffb070"]]);
  s += `<ellipse cx="${PXX + 40 + pdx}" cy="218" rx="38" ry="6" fill="#000" opacity="0.35"/>`;
  s += `<ellipse cx="${mp.x + mp.w / 2 + mdx}" cy="218" rx="${mp.w / 2}" ry="6" fill="#000" opacity="0.35"/>`;
  s += sprites.hero(run.charKey || "warrior", PXX + pdx, PXY, HPX, pose, { white: pWhite });
  s += sprites.mob(e.px, mp.x + mdx, mp.y, PXS, { white: mWhite });
  s += intentIcon(mp.x + mp.w / 2 + mdx, mp.y - 8, b.intent, e.str);
  s += energyOrb(40, 170, b.energy, b.maxEnergy);
  s += `<text x="40" y="206" font-size="11" fill="#9aa" text-anchor="middle" font-family="DejaVu Sans">덱${b.draw.length}·버림${b.discard.length}</text>`;
  if (!hideHand) s += handCards(b.hand, b.energy);
  s += fx;
  return shell(s, run, msg, msgColor, shake);
}

// 이펙트 (rpg-render와 동일 도트풍)
function slashFx(x, y, t) {
  let s = "";
  for (let i = 0; i < 5; i++) { const d = i * 9; s += `<rect x="${x - 26 + d}" y="${y - 30 + d}" width="10" height="10" fill="#fff" opacity="${(1 - t) * (1 - i * 0.12)}"/><rect x="${x - 18 + d}" y="${y - 34 + d}" width="7" height="7" fill="#ffd770" opacity="${(0.9 - t) * (1 - i * 0.12)}"/>`; }
  return s;
}
function dmgNum(x, y, t, text, color = "#fff") {
  return `<text x="${x}" y="${y - 40 - t * 24}" font-size="${22 + (1 - t) * 8}" font-weight="bold" fill="${color}" stroke="#100c18" stroke-width="2" paint-order="stroke" text-anchor="middle" opacity="${1 - t * 0.5}" font-family="DejaVu Sans">${text}</text>`;
}


// ── 카드별 이펙트 ─────────────────────────────────────────────────
function fxFire(x, y, t) {
  let s = "";
  for (let i = 0; i < 10; i++) { const a = (Math.PI * 2 / 10) * i + t; const d = 8 + t * 40; const c = i % 3 === 0 ? "#ffd23a" : i % 3 === 1 ? "#ff9d2e" : "#ff5a2e";
    s += `<rect x="${x + d * Math.cos(a) - 6}" y="${y + d * Math.sin(a) - 6}" width="${12 * (1 - t) + 3}" height="${12 * (1 - t) + 3}" fill="${c}" opacity="${1 - t}"/>`; }
  return s + `<circle cx="${x}" cy="${y}" r="${12 + t * 30}" fill="none" stroke="#ff9d2e" stroke-width="${5 * (1 - t) + 1}" opacity="${1 - t}"/>`;
}
function fxPoison(x, y, t) {
  let s = "";
  for (let i = 0; i < 7; i++) { const xx = x - 28 + i * 10, yy = y - 14 + ((i * 13) % 22) - t * 26;
    s += `<circle cx="${xx}" cy="${yy}" r="${5 * (1 - t) + 1.5}" fill="${i % 2 ? "#5ad05a" : "#2a9a2a"}" opacity="${1 - t}"/>`; }
  return s + `<rect x="${x - 18}" y="${y - 8}" width="36" height="14" fill="#5ad05a" opacity="${(1 - t) * 0.35}"/>`;
}
function fxShield(x, y, t) {
  return `<rect x="${x - 34}" y="${y - 52 + t * 8}" width="68" height="${86 * (1 - t * 0.25)}" fill="none" stroke="#5a9aff" stroke-width="${4 * (1 - t) + 1.5}" opacity="${0.9 - t * 0.5}"/>
    <rect x="${x - 26}" y="${y - 44 + t * 8}" width="52" height="${70 * (1 - t * 0.25)}" fill="#5a9aff" opacity="${(1 - t) * 0.18}"/>`;
}
function fxBuff(x, y, t) {
  let s = "";
  for (let i = 0; i < 4; i++) { const xx = x - 24 + i * 16, yy = y + 14 - t * 52 - (i % 2) * 9;
    s += `<path d="M ${xx} ${yy} l 6 9 h -12 z" fill="#ffd23a" opacity="${1 - t}"/>`; }
  return s;
}
function fxDraw(x, y, t) {
  let s = "";
  for (let i = 0; i < 3; i++) { const xx = x - 20 + i * 18, yy = y - 8 - t * 30 - i * 5;
    s += `<rect x="${xx}" y="${yy}" width="14" height="19" fill="#e8eef8" stroke="#5a9aff" stroke-width="2" opacity="${1 - t}" transform="rotate(${-12 + i * 12} ${xx} ${yy})"/>`; }
  return s;
}
function fxEnergy(x, y, t) {
  let s = "";
  for (let i = 0; i < 6; i++) { const a = (Math.PI * 2 / 6) * i - t * 3; const d = 34 * (1 - t);
    s += `<path d="M ${x + d * Math.cos(a)} ${y + d * Math.sin(a)} l 5 -9 l -3 9 l 5 -2 l -9 11 l 3 -9 z" fill="#ffd23a" opacity="${1 - t * 0.6}"/>`; }
  return s;
}
function fxSpikes(x, y, t) {
  let s = "";
  for (let i = 0; i < 6; i++) { const xx = x - 32 + i * 13;
    s += `<path d="M ${xx} ${y + 30} l 5 ${-20 - t * 10} l 5 ${20 + t * 10} z" fill="#8aff8a" opacity="${1 - t * 0.6}"/>`; }
  return s;
}
function fxExecute(x, y, t) {
  return `<path d="M ${x - 36} ${y - 36} L ${x + 36} ${y + 36} M ${x + 36} ${y - 36} L ${x - 36} ${y + 36}" stroke="#ff3a4a" stroke-width="${10 * (1 - t) + 2}" opacity="${1 - t * 0.4}" stroke-linecap="round"/>
    <circle cx="${x}" cy="${y}" r="${10 + t * 34}" fill="none" stroke="#fff" stroke-width="${3 * (1 - t)}" opacity="${1 - t}"/>`;
}
function fxDouble(x, y, t, phase) {
  const o = phase === 0 ? -14 : 14;
  return slashFx(x + o, y + o * 0.4, t);
}
const FX_AT_ENEMY = { slash: slashFx, heavy: (x, y, t) => slashFx(x, y, t) + `<circle cx="${x}" cy="${y}" r="${8 + t * 26}" fill="none" stroke="#ff9d2e" stroke-width="${4 * (1 - t)}" opacity="${1 - t}"/>`, fire: fxFire, poison: fxPoison, execute: fxExecute, double: fxDouble };
const FX_AT_SELF = { shield: fxShield, buff: fxBuff, heal: null, draw: fxDraw, energy: fxEnergy, spikes: fxSpikes };

// ── 카드 사용 GIF (타격감: 히트스톱 + 넉백 + 피해 비례 흔들림) ─────
async function cardPlayGif(runBefore, ev, runAfter, nextMsg) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  let run = JSON.parse(JSON.stringify(runBefore));
  const b = run.battle, e = b.enemy;
  const mp = mobPos(e.px);
  const ex = mp.x + mp.w / 2, ey = mp.y + mp.h / 2;
  const c = getCard(ev.card);
  const isAtk = c.kind === "attack";
  const fxKey = c.fx || (isAtk ? "slash" : "shield");
  const dmgEf = ev.effects.find((f) => f.t === "dmg");
  const dmg = dmgEf ? dmgEf.n : 0;
  const shakePow = dmg >= 18 ? 11 : dmg >= 10 ? 7 : 4;

  if (isAtk) {
    // 돌진(포즈 전환)
    for (let f = 1; f <= 2; f++) add(scene(run, { pdx: easeOutCubic(f / 2) * 150, pose: f === 2 ? "atk" : "idle", msg: `${ev.name}!`, hideHand: true }), 50);
    // 임팩트: 히트스톱(첫 프레임 길게) + 적 넉백 + 점멸 + 흔들림
    const hits = c.hits || 1;
    for (let h = 0; h < hits; h++) {
      for (let f = 0; f < 3; f++) {
        const t = f / 3;
        if (f === 0 && h === 0) run.battle.enemy.hp -= dmg;
        const fxFn = FX_AT_ENEMY[fxKey] || slashFx;
        const fx = (fxKey === "double" ? fxDouble(ex, ey, t, h) : fxFn(ex, ey, t)) +
          (f >= 0 ? dmgNum(ex, ey - 8, t, `${hits > 1 ? Math.ceil(dmg / hits) : dmg}`, dmg >= 15 ? "#ffd23a" : "#fff") : "");
        add(scene(run, { pdx: 150, pose: "atk", mdx: f < 2 ? 10 + shakePow : 4, mWhite: f === 0, shake: f === 0 ? shakePow : 0, fx, msg: `${ev.name}!`, hideHand: true }),
          f === 0 ? 150 : 75); // ← 히트스톱
      }
    }
    add(scene(run, { pdx: 60, msg: `${ev.name}!`, hideHand: true }), 55);
  } else {
    // 자기 대상 스킬: 제자리 포즈 + 이펙트
    const fxFn = FX_AT_SELF[fxKey];
    for (let f = 0; f < 4; f++) {
      const t = f / 4;
      let fx = fxFn ? fxFn(PXX + 40, PXY + 40, t) : healFx(PXX + 40, PXY + 40, t);
      const labelMap = { block: ["방어 +", "#7ab8ff"], str: ["힘 +", "#ffd23a"], poison: ["독 +", "#5ad05a"], heal: ["+", "#7df0a0"], draw: ["뽑기 ", "#9ac8ff"], energy: ["에너지 +", "#ffd23a"], thorns: ["가시 +", "#8aff8a"], weak: ["약화 ", "#b08aff"], vuln: ["취약 ", "#ffb070"] };
      ev.effects.forEach((f2, i) => { const m = labelMap[f2.t]; if (m) fx += dmgNum(PXX + 40, PXY + 26 - i * 18, t, `${m[0]}${f2.n}`, m[1]); });
      // 독/취약/약화는 적에게도 표시
      if (ev.effects.some((f2) => ["poison", "vuln", "weak"].includes(f2.t)) && fxKey === "poison") fx += fxPoison(ex, ey, t);
      add(scene(run, { pose: "atk", fx, msg: `${ev.name}!`, hideHand: true }), 90);
    }
  }
  // 마지막: 결과 상태 + 손패
  add(scene(runAfter, { msg: nextMsg, msgColor: "#ffe9a8" }), 1500);

  return framesToGif(frames, delays, W, H);
}

async function scenePng(run, msg, msgColor) {
  return svgToPng(scene(run, { msg, msgColor }), W, H);
}

// 적 턴 연출 GIF (endTurn 이벤트 기반)
async function enemyTurnGif(runBefore, events, runAfter, resultMsg, resultColor) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  let run = JSON.parse(JSON.stringify(runBefore));
  const e = run.battle.enemy;
  const mp = mobPos(e.px);
  add(scene(run, { msg: "적의 턴!", hideHand: true }), 350);

  for (const ev of events) {
    if (ev.t === "epoison") {
      run.battle.enemy.hp -= ev.n;
      for (let f = 0; f < 3; f++) add(scene(run, { mWhite: f === 0, fx: dmgNum(mp.x + mp.w / 2, mp.y + 10, f / 3, `독 ${ev.n}`, "#8aff8a"), msg: "독 피해!", hideHand: true }), 110);
    } else if (ev.t === "eattack") {
      for (let f = 1; f <= 3; f++) add(scene(run, { mdx: -easeOutCubic(f / 3) * 120, msg: "적의 공격!", hideHand: true }), 55);
      run.hp -= ev.n;
      for (let f = 0; f < 4; f++) {
        const t = f / 4;
        const txt = ev.n > 0 ? `${ev.n}` : `막음!`;
        const kb = ev.n > 0 && f < 2 ? -(8 + Math.min(10, ev.n)) : 0; // 넉백
        add(scene(run, { mdx: -120, pdx: kb, pose: ev.n > 0 ? "hit" : "idle", pWhite: ev.n > 0 && f === 0, shake: ev.n > 0 ? (ev.n >= 14 ? 10 : 6) : 0, fx: slashFx(PXX + 40, PXY + 45, t) + dmgNum(PXX + 40, PXY + 35, t, txt, ev.n > 0 ? "#ff8a98" : "#7ab8ff"), msg: ev.blocked ? `방어로 ${ev.blocked} 막음` : "적의 공격!", hideHand: true }), f === 0 ? 150 : 80);
      }
      for (let f = 1; f <= 2; f++) add(scene(run, { mdx: -(1 - f / 2) * 120, msg: "...", hideHand: true }), 60);
    } else if (ev.t === "thornsHit") {
      run.battle.enemy.hp -= ev.n;
      add(scene(run, { mWhite: true, fx: dmgNum(mp.x + mp.w / 2, mp.y + 10, 0, `가시${ev.n}`, "#8aff8a"), msg: "가시 반격!", hideHand: true }), 240);
    } else if (ev.t === "eblock") {
      run.battle.enemy.block += ev.n;
      add(scene(run, { fx: dmgNum(mp.x + mp.w / 2, mp.y + 10, 0, `방어 +${ev.n}`, "#7ab8ff"), msg: "적이 방어 태세!", hideHand: true }), 500);
    } else if (ev.t === "ebuff") {
      run.battle.enemy.str += ev.n;
      add(scene(run, { fx: dmgNum(mp.x + mp.w / 2, mp.y + 10, 0, `힘+${ev.n}`, "#ffd23a"), msg: "적이 힘을 모은다!", hideHand: true }), 500);
    } else if (ev.t === "edebuff") {
      run.battle.weak += ev.n;
      add(scene(run, { fx: dmgNum(PXX + 40, PXY + 30, 0, `약화${ev.n}`, "#b08aff"), msg: "약화에 걸렸다!", hideHand: true }), 500);
    }
  }
  add(scene(runAfter, { msg: resultMsg, msgColor: resultColor }), 1500);

  return framesToGif(frames, delays, W, H);
}

module.exports = { scenePng, enemyTurnGif, cardPlayGif, scene, W, H };
