// ── 캐스케이드(연쇄) 슬롯 ──────────────────────────────────────────
// 5열 x 5행 그리드. 같은 심볼이 가로/세로로 3개 이상 이어지면 "터짐".
// 터진 칸은 위에서 새 심볼이 떨어져 채워지고, 또 이어지면 연쇄(체인)!
// 체인이 깊어질수록 배수가 올라갑니다.

const COLS = 5;
const ROWS = 5;

// 심볼: weight=등장 확률, pay=한 클러스터당 기본 배당(개수 보너스는 별도)
const GEMS = [
  { e: "🟦", weight: 26, pay: 0.3 },
  { e: "🟩", weight: 24, pay: 0.4 },
  { e: "🟪", weight: 20, pay: 0.6 },
  { e: "🟧", weight: 16, pay: 0.9 },
  { e: "🟥", weight: 9, pay: 1.6 },
  { e: "💎", weight: 5, pay: 3.0 }, // 레어
];
const BLANK = "⬛"; // 터진 직후 빈 칸 표시용
const SCATTER = "🎆"; // 스캐터: 매치되지 않지만 3개 이상이면 보너스(프리스핀) 발동
const SCATTER_WEIGHT = 1.6;

const TOTAL = GEMS.reduce((s, g) => s + g.weight, 0);
function pick() {
  let r = Math.random() * (TOTAL + SCATTER_WEIGHT);
  if (r < SCATTER_WEIGHT) return SCATTER;
  r -= SCATTER_WEIGHT;
  for (const g of GEMS) if ((r -= g.weight) < 0) return g.e;
  return GEMS[0].e;
}
function payOf(e) {
  return GEMS.find((g) => g.e === e)?.pay || 0;
}
function countScatters(grid) {
  let n = 0;
  for (const row of grid) for (const c of row) if (c === SCATTER) n++;
  return n;
}

function newGrid() {
  // grid[r][c]
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => pick()));
}

// 가로/세로로 3개 이상 이어진 칸들을 찾아 좌표 집합으로 반환
function findMatches(grid) {
  const marked = new Set();
  const key = (r, c) => `${r},${c}`;

  // 가로 (스캐터는 매치에서 제외)
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      if (c < COLS && grid[r][c] !== SCATTER && grid[r][c] === grid[r][c - 1]) run++;
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) marked.add(key(r, k));
        run = 1;
      }
    }
  }
  // 세로 (스캐터는 매치에서 제외)
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      if (r < ROWS && grid[r][c] !== SCATTER && grid[r][c] === grid[r - 1][c]) run++;
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) marked.add(key(k, c));
        run = 1;
      }
    }
  }
  return marked;
}

// 터진 칸 제거 후 중력 적용 + 위쪽 새 심볼 채우기
// 새로 떨어진 스캐터 위치 목록을 반환 (GIF 강조용)
function collapse(grid, marked) {
  const newScatters = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!marked.has(`${r},${c}`)) col.push(grid[r][c]);
    }
    const newStart = col.length; // 이 인덱스부터는 새로 채워진 블록
    while (col.length < ROWS) col.push(pick());
    for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) {
      grid[r][c] = col[i];
      if (i >= newStart && col[i] === SCATTER) newScatters.push([r, c]);
    }
  }
  return newScatters;
}

// 체인별 배수: 1,2,3,5,8,...
const CHAIN_MULT = [1, 1, 2, 3, 5, 8, 12, 20];
function chainMult(chain) {
  return CHAIN_MULT[Math.min(chain, CHAIN_MULT.length - 1)];
}

// 전체 환수율 보정 (시뮬레이션으로 ~88% 맞춤)
const PAYOUT_SCALE = 2.4;

// 한 번 스핀 → 모든 연쇄를 끝까지 진행하고 단계별 스냅샷 반환
// 반환: { steps: [{ grid, marked, stepWin, chain, mult }], totalWin }
function play(bet) {
  const grid = newGrid();
  const steps = [];
  let chain = 0;
  let totalWin = 0;

  // 첫 화면(터지기 전). 처음 깔린 스캐터들도 "등장"으로 기록
  const firstScatters = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] === SCATTER) firstScatters.push([r, c]);
  let scatterTotal = firstScatters.length;
  steps.push({ grid: clone(grid), marked: new Set(), stepWin: 0, chain: 0, mult: 1, phase: "spin", newScatters: firstScatters });

  while (true) {
    const marked = findMatches(grid);
    if (marked.size === 0) break;
    chain++;
    const mult = chainMult(chain);

    let base = 0;
    for (const k of marked) {
      const [r, c] = k.split(",").map(Number);
      base += payOf(grid[r][c]);
    }
    const stepWin = Math.floor(base * mult * (bet / 10) * PAYOUT_SCALE);
    totalWin += stepWin;

    steps.push({ grid: clone(grid), marked, stepWin, chain, mult, phase: "pop", newScatters: [] });

    const newScatters = collapse(grid, marked); // 연쇄 중 새로 떨어진 스캐터
    scatterTotal += newScatters.length;
    steps.push({ grid: clone(grid), marked: new Set(), stepWin, chain, mult, phase: "fall", newScatters });
  }

  return { steps, totalWin, chains: chain, scatters: scatterTotal, freeSpins: freeSpinsFor(scatterTotal) };
}

// 누적 스캐터 → 프리스핀 횟수
function freeSpinsFor(n) {
  if (n >= 5) return 10;
  if (n === 4) return 7;
  if (n >= 3) return 5;
  return 0;
}

function clone(grid) {
  return grid.map((row) => row.slice());
}

// 그리드를 이모지 블록으로 렌더 (marked 칸은 💥로 강조)
function render(grid, marked = new Set()) {
  let out = "";
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      line += marked.has(`${r},${c}`) ? "💥" : grid[r][c];
    }
    out += line + "\n";
  }
  return out;
}

function paytable() {
  return (
    GEMS.map((g) => `${g.e} ×${g.pay}`).join("  ") +
    `\n가로·세로 3개+ 연결 시 터짐! 연쇄될수록 배수 ↑ (최대 ×20)` +
    `\n${SCATTER} 스캐터 3개=프리스핀 5회 · 4개=7회 · 5개+=10회 (배수 상승)`
  );
}

const SCATTER_TRIGGER = 3; // 보너스 발동 스캐터 수
// 프리스핀별 배수 (스핀이 진행될수록 상승, 최대 10회)
const FREE_MULTS = [2, 2, 3, 3, 4, 5, 6, 8, 10, 15];

// 보너스: n회 프리스핀을 한 번에 돌려 결과 반환 (버튼 루프 없이 자동 처리)
function runFreeSpins(bet, n = 5) {
  const spins = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const mult = FREE_MULTS[Math.min(i, FREE_MULTS.length - 1)];
    const r = play(bet);
    const win = Math.floor(r.totalWin * mult);
    total += win;
    spins.push({ grid: r.steps[r.steps.length - 1].grid, steps: r.steps, baseWin: r.totalWin, mult, win, chains: r.chains });
  }
  return { spins, total };
}

module.exports = { COLS, ROWS, GEMS, SCATTER, SCATTER_TRIGGER, FREE_MULTS, freeSpinsFor, play, runFreeSpins, render, paytable, chainMult, countScatters };
