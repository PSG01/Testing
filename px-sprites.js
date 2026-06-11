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
// ── 사람 베이스 (3등신, 32x41) — 정면, 오른손이 무기손 ────────────
// K외곽선 H머리 h머리그늘 i윤기 S피부 t피부그늘 E눈외곽 I홍채 v홍채밝음 w흰자반짝
// p볼터치 m입 C옷 c옷그늘 l옷밝음 A포인트 D하의 d하의그늘 B신발 b신발그늘
const HEAD_ROWS = [
  "..........KKKKKKKK",
  "........KKHHHHHHHHKK",
  ".......KHiHHHHHHHHHHKK",
  "......KHiiHHHHHHHHHHHhK",
  "......KHiHHHHHHHHHHHHhK",
  "......KHHHHHHHHHHHHHHhK",
  "......KHHhSSSSSSSSShHhK",
  "......KHhSSSSSSSSSSSShK",
  "......KHSEEEEESSEEEEEShK",
  "......KHSEwwIESSEwwIEShK",
  "......KHSEwwIESSEwwIEShK",
  "......KHSEIIIESSEIIIEShK",
  "......KHSEvvvESSEvvvEShK",
  "......KHpSSSSSmmSSSSSphK",
  "........KtSSSSSSSSSStK",
  ".........KKttttttttKK",
  "............KttttK",
];
const HUMAN_IDLE = norm([
  ...HEAD_ROWS,
  "..........KKCCCCCCKK",
  ".........KCCCCCCCCCCK",
  "........KCKlCCCCCCCKcK",
  "........KCKlCCCCCCCKcK",
  "........KCKlCCCCCCCKcK",
  "........KCKCCCCCCCcKcK",
  "........KCKAAAAAAAcKcK",
  "........KCKAwAAAAAcKcK",
  "........KSKCCCCCCCcKSK",
  ".......KSSKCCCCCCCcKSSK",
  ".......KSSKCCCCCCCcKSSK",
  ".......KKKKCCCCCCCcKKKK",
  "..........KCCCCCCcK",
  "..........KDDDKKDDDK",
  "..........KDDdKKDDdK",
  "..........KDDdKKDDdK",
  "..........KDDdKKDDdK",
  "..........KDDdKKDDdK",
  "..........KDDdKKDDdK",
  "..........KDDdKKDDdK",
  "..........KBBbKKBBbK",
  "..........KBBbKKBBbK",
  ".........KBBBbKKBBBbK",
  ".........KKKKK..KKKKK",
]);
const HUMAN_ATK = norm([
  ...HEAD_ROWS,
  "..........KKCCCCCCKK",
  ".........KCCCCCCCCCCKK",
  "........KCKlCCCCCCCCCCCKK",
  "........KCKlCCCCCCCCCCKSSK",
  "........KCKlCCCCCCCKKKKSSK",
  "........KCKCCCCCCCcKcKKKK",
  "........KCKAAAAAAAcKcK",
  "........KCKAwAAAAAcKcK",
  "........KSKCCCCCCCcKSK",
  ".......KSSKCCCCCCCcKSSK",
  ".......KSSKCCCCCCCcKSSK",
  ".......KKKKCCCCCCCcKKKK",
  "..........KCCCCCCcK",
  ".........KDDDK..KDDDK",
  ".........KDDdK..KDDdK",
  "........KDDdK....KDDdK",
  "........KDDdK....KDDdK",
  ".......KDDdK......KDDdK",
  ".......KDDdK......KDDdK",
  ".......KBBbK......KBBbK",
  ".......KBBbK......KBBbK",
  "......KBBBbK......KBBBbK",
  "......KKKKK........KKKKK",
]);

// ── 직업별: 팔레트 + 머리 장식 + 무기 오버레이 (44폭) ─────────────
// 머리장식은 머리색(H) 치환 + 추가 픽셀(뿔/복면/모자챙/금테)로 표현
// 'W'=금속 'M'=어두운금속 'A'=포인트색 'G'=나무 'w'=반짝 'K'=외곽선
const pad = (rows) => norm(rows.map((r) => (r + ".".repeat(44)).slice(0, 44)));

const GEAR = {
  warrior: {
    // 진홍 투구(금뿔+볼가드) + 은빛 갑옷, 호박색 눈
    pal: { H: "#8a2434", C: "#aab4c8", D: "#6e7a92", B: "#5a4632", A: "#caa84a", I: "#c87a2e", v: "#f0b860" },
    head: norm([
      ".....KAAK.........KAAK",
      ".....KAAHK.......KHAAK",
      "......KAHK.......KHAK",
      "......KHHK.......KHHK",
      "",
      "",
      "......KHhK........KhhK",
      "......KHhK........KhhK",
      "",
      "",
      "",
      "",
      "",
      "......KHhK........KhhK",
      ".......KKK........KKK",
    ]),
    idle: pad([
      "", "", "", "", "", "", "", "",
      "....................Kw",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "....................KWMK",
      "...................KAAAK",
      "....................KGK",
      "",
      "",
      "....................KGK",
    ]),
    atk: pad([
      "", "", "", "",
      "....................................Kw",
      "...................................KWWK",
      "..................................KWMK",
      ".................................KWMK",
      "................................KWMK",
      "...............................KWMK",
      "..............................KWMK",
      ".............................KWMK",
      "............................KWMK",
      "...........................KWMK",
      "..........................KWMK",
      ".........................KWMK",
      "........................KWMK",
      ".......................KAAAK",
      "........................KGK",
    ]),
  },
  berserker: {
    // 뿔 장식 + 전투 문신, 야성적 빨간 머리, 붉은 눈
    pal: { H: "#b03020", C: "#8a5a3a", D: "#5a3a26", B: "#3a2a1c", A: "#cfd6e6", I: "#c83a2e", v: "#f08860", q: "#d83030" },
    head: norm([
      "...KWWK.............KWWK",
      "..KWWWK.............KWWWK",
      "..KWWK...............KWWK",
      "...KWK...............KWK",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ".......qq.........qq",
      "........qq.......qq",
    ]),
    idle: pad([
      "", "", "", "", "", "",
      "..................KKKK",
      ".................KAwAMK",
      "................KAAAAMMK",
      "................KAAAAMMK",
      ".................KAAMMK",
      "..................KGGK",
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
      "....................KGK",
      "",
      "",
      "....................KGK",
    ]),
    atk: pad([
      "", "", "", "", "", "",
      "................................KKKK",
      "...............................KAwAMK",
      "..............................KAAAAMMK",
      "..............................KAAAAMMK",
      "...............................KAAMMK",
      "..............................KGGK",
      ".............................KGK",
      "............................KGK",
      "...........................KGK",
      "..........................KGK",
      ".........................KGK",
      "........................KGK",
      ".......................KGK",
      "......................KGK",
    ]),
  },
  mage: {
    // 챙 넓은 마법사 모자, 시안색 눈
    pal: { H: "#3a2a6b", C: "#6a4ad0", D: "#4a2f9a", B: "#2a1c5a", A: "#36e6ff", I: "#2aa8d8", v: "#8ae6ff" },
    head: norm([
      "................KiK",
      "..............KKiHK",
      "............KKiHHhK",
      "..........KKHHHHhK",
      "........KKHHAwAHhK",
      "......KKHHHHHAHHhK",
      "....KKHHHHHHHHHHhKKK",
      "..KKHHHHHHHHHHHHHHHHKK",
      ".KHHHHHHHHHHHHHHHHHHHhK",
      "..KKhhhhhhhhhhhhhhhhKK",
    ]),
    idle: pad([
      "", "", "",
      "...................KAAK",
      "..................KAwwAK",
      "..................KAwAAK",
      "...................KAAK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "",
      "",
      "....................KGK",
    ]),
    atk: pad([
      "", "", "", "",
      ".................................KAAK",
      "................................KAwwAK",
      "................................KAwAAK",
      ".................................KAAK",
      "..................................KGK",
      ".................................KGK",
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
    ]),
  },
  rogue: {
    // 짙은 청록 후드 + 복면, 금색 눈
    pal: { H: "#2a5a44", C: "#3a4254", D: "#262c3a", B: "#1c2230", A: "#cfd6e6", I: "#d8a828", v: "#f8d870" },
    head: norm([
      "", "", "", "", "", "",
      "......KHhK........KhhK",
      "......KHhK........KhhK",
      "",
      "",
      "",
      "",
      "",
      "......Khcccccccccccc",
      ".......Khccccccccccc",
      "........KhccccccccK",
      ".........KKccccKK",
    ]),
    idle: pad([
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "....................KAK",
      "....................KAK.w",
      "....................KAK",
      "...................KAAAK",
      "....................KGK",
      "....................KGK",
      "",
      "",
      "....................KGK",
    ]),
    atk: pad([
      "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "............................Kw",
      "...........................KAK",
      "..........................KAK",
      ".........................KAK",
      "........................KAK",
      ".......................KAAAK",
      "........................KGK",
    ]),
  },
  archer: {
    // 올리브 레인저 후드(얼굴 보임), 초록 눈
    pal: { H: "#5a7a3a", C: "#3a7a4a", D: "#2a5a36", B: "#4a3a26", A: "#8a6a4a", I: "#3a9a4a", v: "#8ae08a" },
    head: norm([
      "", "", "", "", "", "",
      "......KHhK........KhhK",
      "......KHhK........KhhK",
      "",
      "",
      "",
      "",
      "",
      "......Khh..........hhK",
      ".......Khh........hhK",
    ]),
    idle: pad([
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "....................KAK",
      ".....................KAK",
      "......................KAK",
      ".......................KAK",
      ".......................KAK",
      ".......................KAK",
      ".......................KAK",
      ".......................KAK",
      ".......................KAK",
      "......................KAK",
      ".....................KAK",
      "....................KAK",
    ]),
    atk: pad([
      "", "", "", "", "", "", "", "", "", "", "", "", "",
      ".......................KAK",
      "........................KAK",
      ".........................KAK",
      "..........................KAK",
      "..........................KAK",
      "..........................KAK",
      "....................WWWWWWWWWWWWWw",
      "..........................KAK",
      "..........................KAK",
      "..........................KAK",
      ".........................KAK",
      "........................KAK",
      ".......................KAK",
    ]),
  },
  priest: {
    // 흰 코이프 + 금테, 금색 눈
    pal: { H: "#f0e8d8", C: "#f0e8d8", D: "#caa84a", B: "#8a7a5a", A: "#ffd23a", I: "#c8982e", v: "#f0d880" },
    head: norm([
      "",
      "",
      "",
      "......KHAAAAAAAAAAAAAhK",
      "",
      "",
      "......KHhK........KhhK",
      "......KHhK........KhhK",
      "",
      "",
      "",
      "",
      "",
      "......Khh..........hhK",
      ".......Khh........hhK",
    ]),
    idle: pad([
      "",
      "..................KAAK",
      ".................KAwwAK",
      ".................KAwwAK",
      "..................KAAK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "....................KGK",
      "",
      "",
      "....................KGK",
    ]),
    atk: pad([
      "",
      "...............................KAAK",
      "..............................KAwwAK",
      "..............................KAwwAK",
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
    ]),
  },
};
const BASE_PAL = {
  K: "#33243f", S: "#ffd9b0", t: "#e8b488",
  E: "#3a2030", I: "#c87a2e", v: "#f0b860", w: "#ffffff",
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
  // EPX 2배 정밀화 후 절반 픽셀로 렌더 → 화면 크기 동일, 해상도 2배
  // 그리는 순서: 몸 → 머리 장식(투구/후드) → 무기
  let s = drawGrid(grid2x(body), pal, x, y, px / 2, { flip, white });
  if (gear.head) s += drawGrid(grid2x(gear.head), pal, x, y, px / 2, { flip, white });
  s += drawGrid(grid2x(weapon), pal, x, y, px / 2, { flip, white });
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
