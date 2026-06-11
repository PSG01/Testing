// ── 던전 전투 렌더러 v2 (도트/픽셀 스타일) ────────────────────────
const px = require("./px-sprites");
const { svgToPng, framesToGif, easeOutCubic } = require("./utils");

const W = 480, H = 320;
const PXS = 4; // 몬스터 픽셀 크기
const HPX = 2.9; // 영웅 픽셀 크기 (32x29 스프라이트 → 93x84)
const PXX = 70, PXY = 142;   // 플레이어 스프라이트 좌상단 (발이 226 그림자선에 닿게)

function mobPos(key) {
  const sz = px.mobSize(key, PXS);
  return { x: 392 - sz.w, y: 222 - sz.h, w: sz.w, h: sz.h };
}

// ── 도트 던전 배경 (벽돌 + 횃불 + 바닥) ───────────────────────────
function background() {
  let s = `<rect width="${W}" height="${H}" fill="#241a36"/>`;
  // 벽돌
  const bw = 40, bh = 22;
  for (let r = 0; r < 9; r++) {
    for (let c = -1; c < 13; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
      s += `<rect x="${x}" y="${y}" width="${bw - 3}" height="${bh - 3}" rx="2" fill="${r % 3 === 0 ? "#322648" : "#2b2040"}"/>`;
    }
  }
  // 바닥
  s += `<rect x="0" y="226" width="${W}" height="${H - 226}" fill="#1c1428"/>`;
  for (let c = 0; c < 16; c++) s += `<rect x="${c * 32}" y="226" width="29" height="12" rx="2" fill="#251a34"/>`;
  // 횃불 2개
  for (const tx of [44, 408]) {
    s += `<rect x="${tx - 3}" y="70" width="6" height="22" fill="#5a4632"/>
      <polygon points="${tx},48 ${tx - 8},66 ${tx + 8},66" fill="#ff9d2e"/>
      <polygon points="${tx},54 ${tx - 4},66 ${tx + 4},66" fill="#ffd23a"/>
      <circle cx="${tx}" cy="62" r="22" fill="#ff9d2e" opacity="0.08"/>`;
  }
  return s;
}

function bar(x, y, w, ratio, fg, label, value) {
  const r = Math.max(0, Math.min(1, ratio));
  return `<text x="${x}" y="${y - 5}" font-size="12" fill="#cfe8d4" font-family="DejaVu Sans">${label}</text>
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="14" fill="#100c18"/>
    <rect x="${x}" y="${y}" width="${w}" height="10" fill="#000" opacity="0.6"/>
    <rect x="${x}" y="${y}" width="${Math.max(4, Math.floor(w * r / 4) * 4)}" height="10" fill="${fg}"/>
    <text x="${x + w}" y="${y - 5}" font-size="12" fill="#fff" text-anchor="end" font-family="DejaVu Sans">${value}</text>`;
}

function turnBar(order) {
  let s = `<text x="${W - 26}" y="58" font-size="11" fill="#9aa" text-anchor="middle" font-family="DejaVu Sans">TURN</text>`;
  (order || ["P", "E", "P", "E", "P"]).slice(0, 5).forEach((who, i) => {
    const y = 66 + i * 28, me = who === "P", sz = i === 0 ? 22 : 17;
    s += `<rect x="${W - 26 - sz / 2}" y="${y}" width="${sz}" height="${sz}" fill="${me ? "#3a9d5c" : "#a02040"}" stroke="${i === 0 ? "#ffd770" : "#100c18"}" stroke-width="${i === 0 ? 2.5 : 2}"/>
      <text x="${W - 26}" y="${y + sz / 2 + 4}" font-size="${i === 0 ? 12 : 10}" font-weight="bold" fill="#fff" text-anchor="middle" font-family="DejaVu Sans">${me ? "나" : "적"}</text>`;
  });
  return s;
}

function shell(body, floor, msg, msgColor = "#ffe9a8", shake = 0) {
  const dx = shake ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const dy = shake ? Math.round((Math.random() - 0.5) * shake) : 0;
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${dx},${dy})">${background()}${body}</g>
    <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#100c18" stroke-width="6"/>
    <rect x="10" y="10" width="64" height="26" fill="#100c18"/>
    <text x="42" y="29" font-size="16" font-weight="bold" fill="#ffd770" text-anchor="middle" font-family="DejaVu Sans">B${floor}F</text>
    <rect x="12" y="${H - 42}" width="${W - 24}" height="30" fill="#100c18"/>
    <rect x="14" y="${H - 40}" width="${W - 28}" height="26" fill="none" stroke="#3a2a5a" stroke-width="2"/>
    <text x="${W / 2}" y="${H - 22}" font-size="14" fill="${msgColor}" text-anchor="middle" font-family="DejaVu Sans">${msg}</text>
  </svg>`;
}

// opts: pdx(돌진), pose, pWhite/mWhite(피격 점멸), shake, fx, msg
function scene(state, { pdx = 0, mdx = 0, pose = "idle", pWhite = false, mWhite = false, shake = 0, fx = "", msg = "", msgColor } = {}) {
  const mp = mobPos(state.mob.key);
  let b = "";
  b += bar(16, 56, 140, state.pHp / state.pMaxHp, "#3ad07a", "HP", `${Math.max(0, state.pHp)}/${state.pMaxHp}`);
  b += bar(16, 82, 140, state.pMp / state.pMaxMp, "#46a0ff", "MP", `${Math.max(0, state.pMp)}/${state.pMaxMp}`);
  b += bar(mp.x - 30, 56, 150, state.mob.hp / state.mob.maxHp, state.mob.isBoss ? "#ff5470" : "#ff9d3a", state.mob.name, `${Math.max(0, state.mob.hp)}`);
  b += turnBar(state.order);
  // 그림자
  b += `<ellipse cx="${PXX + 40 + pdx}" cy="226" rx="38" ry="6" fill="#000" opacity="0.35"/>`;
  b += `<ellipse cx="${mp.x + mp.w / 2 + mdx}" cy="226" rx="${mp.w / 2}" ry="6" fill="#000" opacity="0.35"/>`;
  b += px.hero(state.classKey, PXX + pdx, PXY, HPX, pose, { white: pWhite });
  b += px.mob(state.mob.key, mp.x + mdx, mp.y, PXS, { white: mWhite });
  b += fx;
  return shell(b, state.floor, msg, msgColor, shake);
}

// ── 이펙트 (도트 느낌) ────────────────────────────────────────────
function slashFx(x, y, t) {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const d = i * 9;
    s += `<rect x="${x - 26 + d}" y="${y - 30 + d}" width="10" height="10" fill="#fff" opacity="${(1 - t) * (1 - i * 0.12)}"/>`;
    s += `<rect x="${x - 18 + d}" y="${y - 34 + d}" width="7" height="7" fill="#ffd770" opacity="${(0.9 - t) * (1 - i * 0.12)}"/>`;
  }
  return s;
}
function burstFx(x, y, t, color = "#46a0ff") {
  let s = "";
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i, d = 12 + t * 36;
    s += `<rect x="${x + d * Math.cos(a) - 5}" y="${y + d * Math.sin(a) - 5}" width="10" height="10" fill="${color}" opacity="${1 - t}"/>`;
  }
  return s + `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" fill="#fff" opacity="${(1 - t) * 0.8}"/>`;
}
function healFx(x, y, t) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const xx = x - 30 + i * 13, yy = y - t * 44 + (i % 2) * 9;
    s += `<rect x="${xx}" y="${yy - 4}" width="4" height="12" fill="#7df0a0" opacity="${1 - t}"/><rect x="${xx - 4}" y="${yy}" width="12" height="4" fill="#7df0a0" opacity="${1 - t}"/>`;
  }
  return s;
}
function dmgNum(x, y, t, text, color = "#fff") {
  return `<text x="${x}" y="${y - 44 - t * 26}" font-size="${22 + (1 - t) * 8}" font-weight="bold" fill="${color}" stroke="#100c18" stroke-width="2" paint-order="stroke" text-anchor="middle" opacity="${1 - t * 0.5}" font-family="DejaVu Sans">${text}</text>`;
}

// events: [{actor:'P'|'E', kind:'attack'|'skill'|'heal'|'potion', dmg, crit, label, color}]
async function actionGif(stateBefore, events, stateAfter, resultMsg, resultColor) {
  const frames = [], delays = [];
  const add = (svg, ms) => { frames.push(svg); delays.push(ms); };
  let st = JSON.parse(JSON.stringify(stateBefore));
  add(scene(st, { msg: "..." }), 180);

  for (const ev of events) {
    const isP = ev.actor === "P";
    const mp = mobPos(st.mob.key);
    const tx = isP ? mp.x + mp.w / 2 : PXX + 40;
    const ty = isP ? mp.y + mp.h / 2 : PXY + 45;

    if (ev.kind === "heal" || ev.kind === "potion") {
      for (let f = 0; f < 4; f++) {
        const t = f / 4;
        st.pHp = Math.min(st.pMaxHp, st.pHp + Math.ceil(ev.dmg / 4));
        add(scene(st, { pose: "atk", fx: healFx(PXX + 40, PXY + 40, t) + dmgNum(PXX + 40, PXY + 40, t, `+${ev.dmg}`, "#7df0a0"), msg: ev.label }), 95);
      }
      add(scene(st, { msg: ev.label }), 150);
      continue;
    }

    // 돌진 (플레이어는 공격 포즈로 전환하며)
    const lunge = isP ? 120 : -100;
    for (let f = 1; f <= 3; f++) {
      const t = easeOutCubic(f / 3);
      add(scene(st, { [isP ? "pdx" : "mdx"]: t * lunge, pose: isP ? (f >= 2 ? "atk" : "idle") : "idle", msg: ev.label }), 55);
    }
    // 타격: 피격자 흰색 점멸 + 화면 흔들림 + 이펙트 + 데미지 숫자
    for (let f = 0; f < 4; f++) {
      const t = f / 4;
      if (f === 1) { if (isP) st.mob.hp -= ev.dmg; else st.pHp -= ev.dmg; }
      const fx = (ev.kind === "skill" ? burstFx(tx, ty, t, ev.color || "#46a0ff") : slashFx(tx, ty, t)) +
        (f >= 1 ? dmgNum(tx, ty - 10, t, `${ev.crit ? "!" : ""}${ev.dmg}`, ev.crit ? "#ffd23a" : "#fff") : "");
      add(scene(st, {
        [isP ? "pdx" : "mdx"]: lunge, pose: isP ? "atk" : "idle",
        [isP ? "mWhite" : "pWhite"]: f < 2,
        shake: f < 2 ? (ev.crit ? 9 : 5) : 0,
        fx, msg: ev.label,
      }), 90);
    }
    // 복귀
    for (let f = 1; f <= 2; f++) {
      const t = 1 - f / 2;
      add(scene(st, { [isP ? "pdx" : "mdx"]: t * lunge, msg: ev.label }), 60);
    }
  }
  add(scene(stateAfter, { msg: resultMsg, msgColor: resultColor || "#ffe9a8" }), 1700);

  return framesToGif(frames, delays, W, H);
}

async function scenePng(state, msg, msgColor) {
  return svgToPng(scene(state, { msg, msgColor }), W, H);
}

module.exports = { scenePng, actionGif, scene };
