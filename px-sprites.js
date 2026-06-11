// ── 도트(픽셀) 스프라이트 ─────────────────────────────────────────
// 문자 그리드 → <rect> 픽셀. '.'=투명. 팔레트로 색 치환.
// 스컬 풍: 큰 머리(2등신) + 진한 외곽선 + 3톤 명암(하이라이트/베이스/셰이드).
// 사람: 베이스 2포즈(idle/attack) + 직업별 팔레트/무기 오버레이.

// 그리드 행 길이를 최대폭으로 패딩 (flip 좌표 계산용)
const norm = (rows) => {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, "."));
};

// ── 사람 베이스 (20x24) — 오른쪽을 바라봄 ─────────────────────────
// K외곽선 S피부 t피부그늘 E눈 w눈빛 H머리 h머리그늘 i머리하이라이트
// C옷 c옷그늘 l옷하이라이트 D하의 d하의그늘 B신발 b신발그늘 A포인트
const HUMAN_IDLE = norm([
  "......KKKKKK",
  "....KKiiHHHHKK",
  "...KiiiHHHHHHhK",
  "..KiiHHHHHHHHhhK",
  "..KiHHHHHHHHHHhK",
  "..KHHSSSSSSSSthK",
  "..KHSSSSSSSSSthK",
  "..KSSEwSSSEwSttK",
  "..KSSEESSSEESttK",
  "..KtSSSSSSSSSttK",
  "...KtSSSSSSSttK",
  "....KKttttttKK",
  "....KKKCCCCKK",
  "...KCClCCCCCcK",
  "..KSKllCCCCCcKK",
  ".KStKlCCCCCCcKSK",
  ".KStKCAAAAACcKtK",
  ".KSKKCCCCCCcKKK",
  "..KK.KCCCCCcK.KK",
  ".....KCCCCCcK",
  ".....KDDdKDDdK",
  ".....KDDdKDDdK",
  ".....KBBbKBBbK",
  "....KKKK.KKKK",
]);
const HUMAN_ATK = norm([
  "......KKKKKK",
  "....KKiiHHHHKK",
  "...KiiiHHHHHHhK",
  "..KiiHHHHHHHHhhK",
  "..KiHHHHHHHHHHhK",
  "..KHHSSSSSSSSthK",
  "..KHSSSSSSSSSthK",
  "..KSSEwSSSEwSttK",
  "..KSSEESSSEESttK",
  "..KtSSSSSSSSSttK",
  "...KtSSSSSSSttK",
  "....KKttttttKK",
  "....KKKCCCCKKK",
  "...KCClCCCCCKSSK",
  "..KSKllCCCCCcKSK",
  ".KStKlCCCCCCcKK",
  ".KStKCAAAAACcK",
  ".KSKKCCCCCCcK",
  "..KK.KCCCCCcK",
  ".....KCCCCCcK",
  "....KDDdK.KDDdK",
  "...KDDdK...KDDdK",
  "...KBBbK...KBBbK",
  "..KKKK.....KKKK",
]);

// ── 직업별 무기 오버레이 (idle/atk, 사람 그리드 좌표계 + 우측 확장 = 30폭) ──
// 'W'=금속 'M'=어두운금속 'A'=포인트색 'G'=나무 'w'=반짝 'K'=외곽선
const pad = (rows) => norm(rows.map((r) => (r + ".".repeat(30)).slice(0, 30)));

const GEAR = {
  warrior: {
    pal: { H: "#7a4a2a", C: "#aab4c8", D: "#6e7a92", B: "#5a4632", A: "#caa84a" },
    idle: pad([
      "", "", "", "",
      "................w",
      "...............KWK",
      "...............KWMK",
      "...............KWMK",
      "...............KWMK",
      "...............KWMK",
      "...............KWMK",
      "...............KWMK",
      "...............KWMK",
      "..............KAAAK",
      "...............KGK",
      "...............KGK",
    ]),
    atk: pad([
      "", "", "",
      ".........................Kw",
      "........................KWWK",
      ".......................KWMK",
      "......................KWMK",
      ".....................KWMK",
      "....................KWMK",
      "...................KWMK",
      "..................KWMK",
      ".................KWMK",
      "................KWMK",
      "..............KAAAK",
      "...............KGK",
    ]),
  },
  berserker: {
    pal: { H: "#b03020", C: "#8a5a3a", D: "#5a3a26", B: "#3a2a1c", A: "#cfd6e6" },
    idle: pad([
      "", "",
      ".............KKKK",
      "............KAwAMK",
      "...........KAAAAMMK",
      "...........KAAAAMMK",
      "............KAAMMK",
      ".............KGGK",
      "..............KGK",
      "..............KGK",
      "..............KGK",
      "..............KGK",
      "..............KGK",
      "..............KGK",
      "..............KGK",
    ]),
    atk: pad([
      "...................KKKK",
      "..................KAwAMK",
      ".................KAAAAMMK",
      ".................KAAAAMMK",
      "..................KAAMMK",
      ".................KGGK",
      "................KGK",
      "...............KGK",
      "..............KGK",
      ".............KGK",
    ]),
  },
  mage: {
    pal: { H: "#3a2a6b", C: "#6a4ad0", D: "#4a2f9a", B: "#2a1c5a", A: "#36e6ff" },
    idle: pad([
      "", "",
      "...............KAAK",
      "..............KAwAAK",
      "..............KAAAAK",
      "...............KAAK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
    ]),
    atk: pad([
      "..................KAAK",
      ".................KAwAAK",
      ".................KAAAAK",
      "..................KAAK",
      "..................KGK",
      ".................KGK",
      ".................KGK",
      "................KGK",
      "................KGK",
      "...............KGK",
      "...............KGK",
    ]),
  },
  rogue: {
    pal: { H: "#222230", C: "#3a4254", D: "#262c3a", B: "#1c2230", A: "#cfd6e6" },
    idle: pad([
      "", "", "", "", "", "", "", "", "", "",
      "...............KAK",
      "...............KAK.w",
      "...............KAK",
      "..............KAAAK",
      "...............KGK",
    ]),
    atk: pad([
      "", "", "", "", "", "", "", "",
      "....................Kw",
      "...................KAK",
      "..................KAK",
      ".................KAK",
      "................KAK",
      "..............KAAAK",
      "...............KGK",
    ]),
  },
  archer: {
    pal: { H: "#caa84a", C: "#3a7a4a", D: "#2a5a36", B: "#4a3a26", A: "#8a6a4a" },
    idle: pad([
      "", "", "",
      "................KAK",
      ".................KAK",
      "..................KAK.",
      "..................KAK.",
      "..................KAK.",
      "..................KAK.",
      ".................KAK",
      "................KAK",
      "...............KAK",
    ]),
    atk: pad([
      "", "",
      ".................KAK",
      "..................KAK",
      "...................KAK",
      "...............WWWWWWWWWw",
      "...................KAK",
      "..................KAK",
      ".................KAK",
    ]),
  },
  priest: {
    pal: { H: "#e8d8b8", C: "#f0e8d8", D: "#caa84a", B: "#8a7a5a", A: "#ffd23a" },
    idle: pad([
      "...............KAAK",
      "..............KAwwAK",
      "..............KAwwAK",
      "...............KAAK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
      "................KGK",
    ]),
    atk: pad([
      ".................KAAK",
      "................KAwwAK",
      "................KAwwAK",
      ".................KAAK",
      "..................KGK",
      ".................KGK",
      ".................KGK",
      "................KGK",
      "................KGK",
      "...............KGK",
      "...............KGK",
    ]),
  },
};

const BASE_PAL = {
  K: "#1a1420", S: "#f0c8a0", t: "#d2a47c", E: "#1a1420", w: "#ffffff",
  W: "#e6ecf8", M: "#8a94ad", G: "#8a6a4a",
};

// ── 몬스터 도트 ───────────────────────────────────────────────────
// 각 몬스터: 외곽선 + 베이스 + 명암 2톤 + 포인트. 오른쪽을 바라보게 그리고 flip으로 왼쪽을 봄.
const MOBS = {
  slime: {
    pal: { K: "#0c2440", B: "#1f5a9a", M: "#2a78c8", L: "#4aa4f0", H: "#bfeaff", E: "#0c2438", w: "#ffffff" },
    grid: norm([
      ".........KK",
      ".......KKLLKK",
      "......KLLLLLLK",
      ".....KKKLLLLKKK",
      "....KLLHHLLLLLLK",
      "...KLHHHHLLLLLLMK",
      "..KLHHHLLLLLLLLMMK",
      "..KLHHLLLLLLLLLMMK",
      ".KLLLLLLLLLLLLLMMMK",
      ".KLEwLLLLLLLEwLMMMK",
      ".KLEELLLLLLLEELMMMK",
      ".KMLLLLKKKKLLLLMMBK",
      "..KMMLLKwwKLLLMMBK",
      "...KBMMLLLLLMMMBBK",
      ".....KKBBBBBBBKK",
      ".......KKKKKKK",
    ]),
  },
  bat: {
    pal: { K: "#1c1234", B: "#5a4a8a", L: "#7a66b8", F: "#3a2a60", f: "#4c3a78", E: "#ffd23a", w: "#ffffff", T: "#e8e8e0" },
    grid: norm([
      "K...................K",
      "KK.................KK",
      "KFK......KKK......KFK",
      "KFfK....KLLLK....KfFK",
      "KFfFK..KLLLLLK..KFfFK",
      "KFfFfKKLLLLLLLKKfFfFK",
      "KFfFfFLLLLLLLLLFfFfFK",
      ".KFfFLLEwLLLEwLLFfFK",
      "..KFfLLEELLLEELLfFK",
      "...KFLLLLLLLLLLLFK",
      "....KLLKTKKTKLLK",
      "....KLLLLLLLLLLK",
      ".....KLKLLLLKLK",
      "......KKLLLLKK",
      ".......KKKKK",
    ]),
  },
  goblin: {
    pal: { K: "#14200c", B: "#5a8a3a", L: "#7bb24f", l: "#9ccf6a", D: "#3a5a26", E: "#1a0f08", w: "#ffffff", T: "#e8e8e0", G: "#6a4a2c", g: "#8a6a3c" },
    grid: norm([
      "..K..............K",
      ".KBK....KKKK....KBK",
      "KBBBK..KllLLK..KBBBK",
      "KBLBBKKlLLLLKKKBBLBK",
      ".KBLLLlLLLLLLLLLLBK",
      "..KLLlLLLLLLLLLLLK",
      "..KLEwLLLLLLEwLLDK",
      "..KLEELLLLLLEELLDK",
      "..KLLLLLLLLLLLLDK",
      "..KLLTKKKKKKTLLDK",
      "...KLLKwwwwKLLDK",
      "....KKLLLLLLKKK",
      "...KGggGGGGggGK",
      "..KGgGGGGGGGGgGK",
      "..KGGKDDDDDDKGGK",
      "..KGGK.KDDK.KGGK",
      "...KK..KBBK..KK",
      ".......KKKK",
    ]),
  },
  skeleton: {
    pal: { K: "#262420", B: "#e8e8e0", D: "#b8b8a8", d: "#8a8a7c", E: "#5ad0ff", w: "#ffffff" },
    grid: norm([
      "....KKKKKKK",
      "..KKBBBBBBBKK",
      ".KBBBBBBBBBBBK",
      ".KBBBBBBBBBBBK",
      "KBBBBBBBBBBBBBK",
      "KBKEEKBBBKEEKBK",
      "KBKEwKBBBKEwKBK",
      "KBBBBBKKBBBBBBK",
      ".KBBBBBBBBBBBK",
      ".KDBKBKBKBKBDK",
      "..KKKKBBBKKKK",
      "..KBDKBBBKDBK",
      ".KBBKDBdBDKBBK",
      ".KBdKDBBBDKdBK",
      ".KBK.KDBDK.KBK",
      ".KdK..KBK..KdK",
      "......KBKBK",
      ".....KBBKBBK",
      ".....KKK.KKK",
    ]),
  },
  orc: {
    pal: { K: "#101a0c", B: "#3a7a4a", L: "#4f9a5f", l: "#6cb87a", D: "#2a4a30", E: "#ff4a3a", w: "#ffffff", T: "#f0e8d8", M: "#6e7a92", m: "#525c70" },
    grid: norm([
      "...KKKKKKKKKK",
      "..KLllLLLLLLLK",
      ".KLllLLLLLLLLLK",
      "KLlLLLLLLLLLLLDK",
      "KLKKKLLLLKKKLLDK",
      "KLKEEwKLLKEEwLDK",
      "KLKEEEKLLKEEELDK",
      "KLLLLLLLLLLLLLDK",
      "KLLKKKKKKKKKLLDK",
      "KLTKLLLLLLKTLLDK",
      "KLTKLLLLLLKTLDK",
      ".KLLLLLLLLLLLK",
      ".KKMMmMMMMmMKK",
      "KMMMMmMMMMmMMMK",
      "KMMKMMMMMMMMKMK",
      "KMMKDDDDDDDDKMK",
      "KDDK.KDDDDK.KDDK",
      ".KK..KDDDDK..KK",
      ".....KKKKKK",
    ]),
  },
  dragon: {
    pal: { K: "#2a0610", B: "#7a1830", L: "#c03050", l: "#e05a72", M: "#a02040", D: "#5a0f20", E: "#ffd23a", w: "#ffffff", H: "#ff8a6a", G: "#e8c878", g: "#c8a050" },
    grid: norm([
      "K......................K",
      "KK....KK........KK....KK",
      "KDK..KDDK..KK..KDDK..KDK",
      "KDDK.KDK..KllK..KDK.KDDK",
      "KDDDKKK..KlLLLK..KKKDDDK",
      ".KDDDK..KlLLLLLK..KDDDK",
      "..KDDKKKlLLLLLLMKKKDDK",
      "...KDDLlLLLLLLLMMDDK",
      "....KLlKEEwLKEEwMMK",
      "....KLlKEEELKEEEMMK",
      "....KLLLLLLLLLMMMK",
      "...KLLHKKKKKKHLMMK",
      "...KLLKwHHHHwKLMMK",
      "..KMLLGGggGGGLLMBK",
      "..KMLLGGggGGGLLMBK",
      ".KMMLLGGGGGGLLMMBK",
      ".KMMMLLGGGGLLMMBBK",
      "..KKMMKKKKKKMMBKK",
      "...KMMK....KMMK",
      "....KKK....KKK",
    ]),
  },
};

// ── 렌더 함수 ─────────────────────────────────────────────────────
function drawGrid(grid, pal, x, y, px, { flip = false, white = false } = {}) {
  let s = "";
  const wch = Math.max(...grid.map((r) => r.length));
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === "." || ch === " ") continue;
      const col = white ? "#ffffff" : (pal[ch] || "#f0f");
      const cx = flip ? (wch - 1 - c) : c;
      s += `<rect x="${x + cx * px}" y="${y + r * px}" width="${px}" height="${px}" fill="${col}"/>`;
    }
  }
  return s;
}

// 색 보정
const clamp8 = (n) => Math.max(0, Math.min(255, n));
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp8(Math.floor(((n >> 16) & 255) * f)), g = clamp8(Math.floor(((n >> 8) & 255) * f)), b = clamp8(Math.floor((n & 255) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};
const darken = (hex, f = 0.72) => shade(hex, f);
const lighten = (hex, f = 0.45) => {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp8(Math.floor(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * f));
  const g = clamp8(Math.floor(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * f));
  const b = clamp8(Math.floor((n & 255) + (255 - (n & 255)) * f));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// 직업 스프라이트 (pose: 'idle'|'atk')
function hero(classKey, x, y, px, pose = "idle", { flip = false, white = false } = {}) {
  const gear = GEAR[classKey] || GEAR.warrior;
  const pal = { ...BASE_PAL, ...gear.pal };
  pal.c = darken(pal.C); pal.d = darken(pal.D); pal.h = darken(pal.H); pal.b = darken(pal.B);
  pal.l = lighten(pal.C, 0.35); pal.i = lighten(pal.H, 0.35);
  const body = pose === "atk" ? HUMAN_ATK : HUMAN_IDLE;
  const weapon = pose === "atk" ? gear.atk : gear.idle;
  return `<g shape-rendering="crispEdges">${drawGrid(body, pal, x, y, px, { flip, white })}${drawGrid(weapon, pal, x, y, px, { flip, white })}</g>`;
}

function mob(key, x, y, px, { white = false } = {}) {
  const m = MOBS[key] || MOBS.slime;
  return `<g shape-rendering="crispEdges">${drawGrid(m.grid, m.pal, x, y, px, { flip: true, white })}</g>`;
}

function mobSize(key, px) {
  const m = MOBS[key] || MOBS.slime;
  return { w: Math.max(...m.grid.map((r) => r.length)) * px, h: m.grid.length * px };
}
const HERO_H = HUMAN_IDLE.length; // 24

module.exports = { hero, mob, mobSize, HERO_H, drawGrid };
