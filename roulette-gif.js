// ── 룰렛 휠 GIF 렌더러 ────────────────────────────────────────────
// 휠이 여러 바퀴 돌다 감속하며 결과 칸이 상단 포인터에 멈춤. loop:1 (1회 재생 후 정지)
// 빠른 회전 구간엔 휠 잔상(고스트) 모션 블러, 착지 시 컨페티 + 글로우.
const R = require("./roulette");
const { framesToGif, easeOutCubic, seededRand } = require("./utils");

const W = 430, H = 470;
const CX = W / 2, CY = 235, RAD = 185;
const N = R.ORDER.length; // 37
const SEG = (2 * Math.PI) / N;

const COL = { red: "#d6293a", black: "#23252f", green: "#1f9d55" };

function arcPath(cx, cy, r1, r2, a0, a1) {
  const x0 = cx + r2 * Math.cos(a0), y0 = cy + r2 * Math.sin(a0);
  const x1 = cx + r2 * Math.cos(a1), y1 = cy + r2 * Math.sin(a1);
  const x2 = cx + r1 * Math.cos(a1), y2 = cy + r1 * Math.sin(a1);
  const x3 = cx + r1 * Math.cos(a0), y3 = cy + r1 * Math.sin(a0);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r2} ${r2} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${r1} ${r1} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

// 세그먼트들만 (rot 회전각, withText: 숫자 라벨 포함 여부)
function segsAt(rot, withText, resultIdx = -1, hitStroke = false) {
  let segs = "";
  for (let i = 0; i < N; i++) {
    const a0 = rot + i * SEG - Math.PI / 2 - SEG / 2;
    const a1 = a0 + SEG;
    const n = R.ORDER[i];
    const isHit = hitStroke && i === resultIdx;
    segs += `<path d="${arcPath(CX, CY, 92, RAD, a0, a1)}" fill="${COL[R.colorOf(n)]}" stroke="${isHit ? "#ffd770" : "#0e0f17"}" stroke-width="${isHit ? 4 : 1.5}"/>`;
    if (!withText) continue;
    const am = (a0 + a1) / 2, tr = RAD - 22;
    const tx = CX + tr * Math.cos(am), ty = CY + tr * Math.sin(am);
    segs += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="middle" transform="rotate(${((am + Math.PI / 2) * 180 / Math.PI).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)})" font-family="DejaVu Sans">${n}</text>`;
  }
  return segs;
}

// rot: 휠 회전각(라디안). 상단(-90°) 포인터 기준.
// spinDelta: 직전 프레임 대비 회전량(rad) — 크면 잔상 블러를 깐다.
function wheelSvg(rot, header, headColor, resultIdx = -1, glow = 0, spinDelta = 0) {
  const fast = Math.abs(spinDelta) > 0.12;
  let wheel = "";
  if (fast) {
    // 잔상 2겹 (직전 각도 방향) + 본체 — 회전 모션 블러
    wheel += `<g opacity="0.20">${segsAt(rot - spinDelta * 0.8, false)}</g>`;
    wheel += `<g opacity="0.30">${segsAt(rot - spinDelta * 0.4, false)}</g>`;
    wheel += `<g opacity="0.85">${segsAt(rot, Math.abs(spinDelta) < 0.35)}</g>`;
  } else {
    wheel = segsAt(rot, true, resultIdx, glow > 0);
  }
  const hit = resultIdx >= 0 && glow > 0 ? `<circle cx="${CX}" cy="${CY}" r="${RAD + 8}" fill="none" stroke="#ffd770" stroke-width="3" opacity="${(glow * 0.8).toFixed(2)}"/>` : "";
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bg" cx="0.5" cy="0.45" r="0.85"><stop offset="0" stop-color="#2a1a55"/><stop offset="1" stop-color="#140a2e"/></radialGradient></defs>
    <rect width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
    <text x="${CX}" y="34" font-size="24" font-weight="bold" fill="${headColor}" text-anchor="middle" font-family="DejaVu Sans">${header}</text>
    <circle cx="${CX}" cy="${CY}" r="${RAD + 5}" fill="#3b2a6b"/>
    ${wheel}
    <circle cx="${CX}" cy="${CY}" r="90" fill="#1c1430" stroke="#ffd770" stroke-width="3"/>
    ${hit}
    <polygon points="${CX - 13},${CY - RAD - 14} ${CX + 13},${CY - RAD - 14} ${CX},${CY - RAD + 12}" fill="#ffd770" stroke="#fff" stroke-width="2"/>
  </svg>`;
}

// 착지 컨페티 (포인터 주변에서 흩날림)
function confetti(t, seed) {
  const rnd = seededRand(seed);
  const cols = ["#ffd770", "#ff6b7d", "#5fe09a", "#9ac8ff", "#fff"];
  let s = "";
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, sp = 70 + rnd() * 150;
    const x = CX + Math.cos(a) * sp * t, y = (CY - RAD) + Math.sin(a) * sp * t + 170 * t * t;
    const rot = rnd() * 360 + t * 240;
    s += `<rect x="${(x - 5).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="10" height="6" rx="1" fill="${cols[i % cols.length]}" opacity="${(1 - t * 0.55).toFixed(2)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return s;
}
const inject = (svg, extra) => svg.replace("</svg>", `${extra}</svg>`);

// 가운데 결과 표시 포함 프레임
function withCenter(svg, text, sub, color) {
  return inject(svg, `<text x="${CX}" y="${CY - 4}" font-size="44" font-weight="bold" fill="${color}" text-anchor="middle" font-family="DejaVu Sans">${text}</text><text x="${CX}" y="${CY + 30}" font-size="18" fill="#ffe9a8" text-anchor="middle" font-family="DejaVu Sans">${sub}</text>`);
}

async function render(resultNumber, betLabel) {
  const resultIdx = R.ORDER.indexOf(resultNumber);
  // 결과 칸이 상단 포인터(-90°)에 오도록: rot + idx*SEG = 0 (mod 2π) → 최종 rot
  const finalRot = -resultIdx * SEG - 4 * 2 * Math.PI; // 4바퀴 돌고 안착
  const frames = [], delays = [];
  const SPIN_F = 30;
  let prevRot = 0;
  for (let f = 1; f <= SPIN_F; f++) {
    const t = easeOutCubic(f / SPIN_F);
    const rot = finalRot * t;
    frames.push(wheelSvg(rot, "ROULETTE", "#ffd770", -1, 0, rot - prevRot));
    prevRot = rot;
    delays.push(f < SPIN_F * 0.6 ? 45 : 70); // 끝으로 갈수록 느려짐
  }
  // 착지 강조 (번쩍 + 칸 하이라이트 + 컨페티)
  const landRot = finalRot;
  for (let f = 0; f < 5; f++) {
    const t = (f + 1) / 5;
    frames.push(inject(wheelSvg(landRot, `HIT  ${resultNumber}`, "#fff", resultIdx, 1 - f * 0.18), confetti(t, resultNumber + 13)));
    delays.push(120);
  }
  // 결과 화면 (중앙 큰 숫자) — 마지막 프레임에서 정지
  const colName = { red: "RED", black: "BLACK", green: "GREEN" }[R.colorOf(resultNumber)];
  frames.push(withCenter(wheelSvg(landRot, betLabel, "#9bf0c0", resultIdx, 0.5), String(resultNumber), colName, R.colorOf(resultNumber) === "red" ? "#ff6b7d" : R.colorOf(resultNumber) === "green" ? "#5fe09a" : "#e6e8f0"));
  delays.push(2200);

  const out = await framesToGif(frames, delays, W, H);
  return { ...out, frameCount: frames.length };
}

module.exports = { render };
