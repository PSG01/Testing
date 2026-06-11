// ── 도트(픽셀) 스프라이트 ─────────────────────────────────────────
// 문자 그리드 → <rect> 픽셀. '.'=투명. 팔레트로 색 치환.
// 커미션 도트 풍: 32x40 베이스 + EPX 2배(64x80) — 큰 반짝이 눈, 미소, 볼터치, 윤기.
// 사람: 베이스 2포즈(idle/attack) + 직업별 팔레트/머리장식/무기 오버레이.

// 그리드 행 길이를 최대폭으로 패딩 (flip 좌표 계산용)
const norm = (rows) => {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(w, "."));
};

// ── 사람 베이스 (32x40) — 오른쪽이 앞 ─────────────────────────────
// K외곽선 H머리 h머리그늘 i윤기 S피부 t피부그늘 E눈외곽 I홍채 v홍채밝음 w흰자반짝
// p볼터치 m입 C옷 c옷그늘 l옷밝음 A포인트 D하의 B신발
// ── 사람 베이스 (파스텔 치비, 32x29) — 큰 머리채 + 작은 얼굴 ──────
// K외곽선(따뜻한 갈색) H머리 h머리그늘 i윤기 S피부 E눈 w눈빛 p볼터치 m입
// C상의 c상의그늘 l상의밝음 A벨트/포인트 D하의(스커트/타바드) d하의그늘 B신발
const HEAD_ROWS = [
  ".........KKKKKKKKKK",
  ".......KKHHHHHHHHHHKK",
  "......KHHHHHHHHHHHHHHK",
  ".....KHHiiHHHHHHHHHHHHK",
  "....KHiiiiHHHHHHHHHHHHHK",
  "....KHiiiHHHHHHHHHHHHHHK",
  "....KHHHHHHHHHHHHHHHHHHK",
  "....KHHHHhHHHHhHHHHhHHHK",
  "....KHHHHhHHHHhHHHHhHHHK",
  "....KHHHhHHHHhHHHHhHHHHK",
  "....KHhSSSSSSSSSSSSShHHK",
  "....KHhSSEwSSSSSEwSShHHK",
  "....KHhpSEESSSSSEESphHHK",
  "....KHhSSEESSSSSEESShHHK",
  "....KHHhSSSSSmSSSSShHHHK",
  ".....KHHhhSSSSSShhHHHHK",
];
const HUMAN_IDLE = norm([
  ...HEAD_ROWS,
  ".....KHhKKKCCCCKKKKHHhK",
  ".....KHhK.KCCCCCCK.KHhK",
  ".....KHhK.KCCCCCCK.KHhK",
  ".....KhhKKSKCCCCKSKKhhK",
  ".....KhK.KKAAAAAAKK.KhK",
  ".....KhK.KDDDDDDDDK.KhK",
  "......KK.KDDDDDDDDK.KK",
  "........KDDDDDDDDDDK",
  "........KDdDdDdDdDdK",
  "..........KSSK.KSSK",
  "..........KSSK.KSSK",
  ".........KBBBK.KBBBK",
  ".........KKKK...KKKK",
]);
const HUMAN_ATK = norm([
  ...HEAD_ROWS,
  ".....KHhKKKCCCCKKKKHHhK",
  ".....KHhK.KCCCCCCCKSSK",
  ".....KHhK.KCCCCCCKKSSK",
  ".....KhhKKSKCCCCKKKKhhK",
  ".....KhK.KKAAAAAAKK.KhK",
  ".....KhK.KDDDDDDDDK.KhK",
  "......KK.KDDDDDDDDK.KK",
  "........KDDDDDDDDDDK",
  "........KDdDdDdDdDdK",
  ".........KSSK...KSSK",
  "........KSSK.....KSSK",
  ".......KBBBK.....KBBBK",
  ".......KKKK.......KKKK",
]);

// ── 직업별: 팔레트(머리 3톤 수동 지정) + 머리 장식 + 무기 (40폭) ──
const pad = (rows) => norm(rows.map((r) => (r + ".".repeat(40)).slice(0, 40)));

const GEAR = {
  warrior: {
    // 진홍 투구머리 + 금뿔/금테, 흰 상의 + 강철 타바드
    pal: { H: "#b8485a", h: "#8a3140", i: "#e08890", C: "#f0ece4", D: "#9aa6b8", B: "#6a4430", A: "#d8a848" },
    head: norm([
      ".....KAK............KAK",
      ".....KAAK..........KAAK",
      "......KAK..........KAK",
      "",
      "",
      "",
      "",
      "",
      "",
      "....KAAAAAAAAAAAAAAAAAK",
    ]),
    idle: pad([
      "", "", "", "", "", "",
      "...................Kw",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "...................KWMK",
      "..................KAAAK",
      "...................KGK",
    ]),
    atk: pad([
      "", "", "", "",
      "...............................Kw",
      "..............................KWWK",
      ".............................KWMK",
      "............................KWMK",
      "...........................KWMK",
      "..........................KWMK",
      ".........................KWMK",
      "........................KWMK",
      ".......................KWMK",
      "......................KWMK",
      ".....................KWMK",
      "....................KAAAK",
      ".....................KGK",
    ]),
  },
  berserker: {
    // 다홍 갈기머리 + 흰 뿔, 가죽 조끼
    pal: { H: "#d85838", h: "#a8381f", i: "#f08858", C: "#a8765a", D: "#7a5438", B: "#4e3424", A: "#cfd6e6" },
    head: norm([
      "...KWWK..............KWWK",
      "..KWWWK..............KWWWK",
      "..KWWK................KWWK",
      "...KWK................KWK",
    ]),
    idle: pad([
      "", "", "", "",
      ".................KKKK",
      "................KAwAMK",
      "...............KAAAAMMK",
      "...............KAAAAMMK",
      "................KAAMMK",
      ".................KGGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
      "..................KGK",
    ]),
    atk: pad([
      "", "", "", "",
      "..............................KKKK",
      ".............................KAwAMK",
      "............................KAAAAMMK",
      "............................KAAAAMMK",
      ".............................KAAMMK",
      "............................KGGK",
      "...........................KGK",
      "..........................KGK",
      ".........................KGK",
      "........................KGK",
      ".......................KGK",
      "......................KGK",
      ".....................KGK",
      "....................KGK",
    ]),
  },
  mage: {
    // 마젠타 머리 + 기울어진 미니 마녀모자, 라벤더 원피스
    pal: { H: "#c05a90", h: "#92406a", i: "#e088b8", C: "#b59ae0", D: "#8a6ac8", B: "#5a4690", A: "#36e6ff" },
    head: norm([
      "........KhK",
      ".......KhDDK",
      "......KhDDDDK",
      ".....KDDDDADDK",
      "....KKDDDDDDDKK",
      "...KDDDDDDDDDDDK",
      "....KKKKKKKKKKK",
    ]),
    idle: pad([
      "",
      "..................KAAK",
      ".................KAwwAK",
      ".................KAwAAK",
      "..................KAAK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
    ]),
    atk: pad([
      "",
      "...............................KAAK",
      "..............................KAwwAK",
      "..............................KAwAAK",
      "...............................KAAK",
      "................................KGK",
      "...............................KGK",
      "..............................KGK",
      ".............................KGK",
      "............................KGK",
      "...........................KGK",
      "..........................KGK",
      ".........................KGK",
      "........................KGK",
      ".......................KGK",
      "......................KGK",
      ".....................KGK",
    ]),
  },
  rogue: {
    // 청록 후드머리 + 복면, 짙은 잠행복
    pal: { H: "#3a7a5e", h: "#27563f", i: "#5aa482", C: "#4a5468", D: "#343c4e", B: "#262c3a", A: "#cfd6e6" },
    head: norm([
      "", "", "", "", "", "", "", "", "", "", "", "", "",
      "....KHhcccccccccccchHHK",
      "....KHHhcccccccccchHHHK",
    ]),
    idle: pad([
      "", "", "", "", "", "", "", "", "", "", "", "", "",
      "...................KAK",
      "...................KAK.w",
      "...................KAK",
      "..................KAAAK",
      "...................KGK",
    ]),
    atk: pad([
      "", "", "", "", "", "", "", "", "", "",
      "..........................Kw",
      ".........................KAK",
      "........................KAK",
      ".......................KAK",
      "......................KAK",
      ".....................KAAAK",
      "....................KGK",
    ]),
  },
  archer: {
    // 올리브 머리 + 깃털 장식, 초록 복장
    pal: { H: "#8aa050", h: "#647839", i: "#b4c878", C: "#5a8a5a", D: "#3e6442", B: "#5a4430", A: "#9a7a52" },
    head: norm([
      ".................KWK",
      "................KWWK",
      "................KWK",
    ]),
    idle: pad([
      "", "", "", "", "", "", "", "",
      "...................KAK",
      "....................KAK",
      ".....................KAK",
      ".....................KAK",
      ".....................KAK",
      ".....................KAK",
      ".....................KAK",
      ".....................KAK",
      "....................KAK",
      "...................KAK",
    ]),
    atk: pad([
      "", "", "", "", "", "", "", "", "",
      ".....................KAK",
      "......................KAK",
      ".......................KAK",
      ".......................KAK",
      "..................WWWWWWWWWWWw",
      ".......................KAK",
      ".......................KAK",
      "......................KAK",
      ".....................KAK",
    ]),
  },
  priest: {
    // 크림색 머리 + 금 서클릿, 흰 로브
    pal: { H: "#f0e6d2", h: "#cab89a", i: "#fffaf0", C: "#faf6ee", D: "#e8e0d0", B: "#b89a6a", A: "#e8b84a" },
    head: norm([
      "", "", "", "", "", "", "",
      "....KAAAAAAAAAAAAAAAAAK",
    ]),
    idle: pad([
      "",
      ".................KAAK",
      "................KAwwAK",
      "................KAwwAK",
      ".................KAAK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
      "...................KGK",
    ]),
    atk: pad([
      "",
      "..............................KAAK",
      ".............................KAwwAK",
      ".............................KAwwAK",
      "..............................KAAK",
      "...............................KGK",
      "..............................KGK",
      ".............................KGK",
      "............................KGK",
      "...........................KGK",
      "..........................KGK",
      ".........................KGK",
      "........................KGK",
      ".......................KGK",
      "......................KGK",
      ".....................KGK",
    ]),
  },
};
const BASE_PAL = {
  K: "#2b1f33", S: "#ffd9b0", t: "#e0a884",
  E: "#2c2030", I: "#c87a2e", v: "#f0b860", w: "#ffffff",
  p: "#ffaa9a", m: "#c06a52",
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
      ".KFfFLEEwwLLEEwwLFfFK",
      "..KFfLEEwwLLEEwwLfFK",
      "..KFfLEEEELLEEEELfFK",
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
      "..KLEEwwLLLEEwwLDK",
      "..KLEEwwLLLEEwwLDK",
      "..KLEEEELLLEEEELDK",
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
      "KBKEwwKBBKEwwBK",
      "KBKEwwKBBKEwwBK",
      "KBKEEEKBBKEEEBK",
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
      "KLKEwwKLLKEwwLDK",
      "KLKEwwKLLKEwwLDK",
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
      "....KLlKEwwLKEwwMMK",
      "....KLlKEwwLKEwwMMK",
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
// EPX(Scale2x): 도트를 2배 해상도로 키우면서 대각선 계단을 둥글림.
// 원본 그리드는 손으로 찍기 쉬운 크기로 유지하고, 출력만 2배 정밀화.
function scale2x(grid) {
  const h = grid.length, w = Math.max(...grid.map((r) => r.length));
  const at = (r, c) => (r < 0 || r >= h || c < 0 || c >= w ? "." : (grid[r][c] || "."));
  const out = Array.from({ length: h * 2 }, () => new Array(w * 2).fill("."));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const P = at(r, c);
      const A = at(r - 1, c), B = at(r, c + 1), C = at(r, c - 1), D = at(r + 1, c);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      out[r * 2][c * 2] = p1; out[r * 2][c * 2 + 1] = p2;
      out[r * 2 + 1][c * 2] = p3; out[r * 2 + 1][c * 2 + 1] = p4;
    }
  }
  return out.map((row) => row.join(""));
}
const memo2x = new Map();
function grid2x(grid) {
  if (!memo2x.has(grid)) memo2x.set(grid, scale2x(grid));
  return memo2x.get(grid);
}

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
// 두 색 혼합 (t: 0~1, b 비율)
const mix = (a, b, t) => {
  const na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
  const ch = (sa, sb) => clamp8(Math.round(sa + (sb - sa) * t));
  const r = ch((na >> 16) & 255, (nb >> 16) & 255), g = ch((na >> 8) & 255, (nb >> 8) & 255), bl = ch(na & 255, nb & 255);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
};
// 그림자는 보라 쪽으로, 하이라이트는 따뜻한 쪽으로 색조 이동 (hue shifting)
const shadeCool = (hex) => mix(shade(hex, 0.74), "#3a2c5a", 0.22);
const tintWarm = (hex, f = 0.4) => mix(mix(hex, "#ffffff", f), "#fff0d0", 0.25);
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
  pal.c = shadeCool(pal.C); pal.d = shadeCool(pal.D); pal.h = shadeCool(pal.H); pal.b = shadeCool(pal.B);
  pal.l = tintWarm(pal.C, 0.32); pal.i = tintWarm(pal.H, 0.32);
  const body = pose === "atk" ? HUMAN_ATK : HUMAN_IDLE;
  const weapon = pose === "atk" ? gear.atk : gear.idle;
  // 영웅은 EPX 없이 원본 도트 그대로 — 각진 픽셀 클러스터의 또렷한 맛을 유지
  // 그리는 순서: 몸 → 머리 장식(투구/후드/머리카락) → 무기
  let s = drawGrid(body, pal, x, y, px, { flip, white });
  if (gear.head) s += drawGrid(gear.head, pal, x, y, px, { flip, white });
  s += drawGrid(weapon, pal, x, y, px, { flip, white });
  return `<g shape-rendering="crispEdges">${s}</g>`;
}

function mob(key, x, y, px, { white = false } = {}) {
  const m = MOBS[key] || MOBS.slime;
  return `<g shape-rendering="crispEdges">${drawGrid(grid2x(m.grid), m.pal, x, y, px / 2, { flip: true, white })}</g>`;
}

function mobSize(key, px) {
  const m = MOBS[key] || MOBS.slime;
  return { w: Math.max(...m.grid.map((r) => r.length)) * px, h: m.grid.length * px };
}
const HERO_H = HUMAN_IDLE.length; // 40
const HERO_W = Math.max(...HUMAN_IDLE.map((r) => r.length)); // 32

module.exports = { hero, mob, mobSize, HERO_H, HERO_W, drawGrid };
