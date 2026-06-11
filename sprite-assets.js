// ── 스프라이트 에셋 로더 ──────────────────────────────────────────
// assets/sprites/<카테고리>/<이름>/<포즈>.png 가 있으면 그 이미지를 쓰고,
// 없으면 px-sprites(코드 도트)로 폴백한다.
//
// 사용 예:
//   assets/sprites/heroes/warrior/idle.png   ← 전사 대기
//   assets/sprites/heroes/warrior/atk.png    ← 전사 공격
//   assets/sprites/heroes/warrior/hit.png    ← 전사 피격 (없으면 idle 폴백)
//   assets/sprites/mobs/slime/idle.png       ← 슬라임
// 포즈 폴백 순서: 요청 포즈 → idle → 코드 도트
//
// 이미지 규격: 투명 배경 PNG. 크기는 자유 (세로 기준으로 맞춰 스케일).
// 도트 이미지는 원본 해상도 그대로 넣는 게 가장 깨끗하다 (nearest 확대).
const fs = require("fs");
const path = require("path");
const px = require("./px-sprites");

const ROOT = path.join(__dirname, "assets", "sprites");
const cache = new Map(); // key → { dataUri, w, h } | null

function load(category, name, pose) {
  const key = `${category}/${name}/${pose}`;
  if (cache.has(key)) return cache.get(key);
  let out = null;
  const file = path.join(ROOT, category, name, `${pose}.png`);
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    // PNG 크기 직접 파싱 (IHDR: 16바이트째부터 w/h 빅엔디언 4바이트씩)
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    out = { dataUri: `data:image/png;base64,${buf.toString("base64")}`, w, h };
  }
  cache.set(key, out);
  return out;
}

// SVG <image> 조각 생성 — 박스 높이에 맞춰 스케일, 바닥 중앙 정렬
function imageTag(asset, x, y, boxW, boxH, { flip = false, white = false } = {}) {
  const scale = boxH / asset.h;
  const w = asset.w * scale, h = boxH;
  const ix = x + (boxW - w) / 2, iy = y + (boxH - h);
  const tf = flip ? ` transform="translate(${(ix * 2 + w).toFixed(1)},0) scale(-1,1)"` : "";
  const op = white ? ` opacity="0.35"` : ""; // 피격 점멸은 반투명 깜빡임으로 표현
  return `<image href="${asset.dataUri}" x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" image-rendering="optimizeSpeed" style="image-rendering:pixelated"${op}${tf}/>`;
}

// 영웅: 에셋 있으면 이미지, 없으면 코드 도트 (32x29 그리드, px 단위)
function hero(classKey, x, y, pxSize, pose = "idle", opts = {}) {
  const asset = load("heroes", classKey, pose) || load("heroes", classKey, "idle");
  if (asset) return imageTag(asset, x, y, 32 * pxSize, 29 * pxSize, opts);
  return px.hero(classKey, x, y, pxSize, pose === "atk" ? "atk" : "idle", opts);
}

// 몬스터: 에셋 있으면 이미지, 없으면 코드 도트
function mob(key, x, y, pxSize, pose = "idle", opts = {}) {
  const asset = load("mobs", key, pose) || load("mobs", key, "idle");
  if (asset) {
    const sz = px.mobSize(key, pxSize);
    return imageTag(asset, x, y, sz.w, sz.h, { flip: true, ...opts });
  }
  return px.mob(key, x, y, pxSize, opts);
}

const mobSize = (key, pxSize) => px.mobSize(key, pxSize);

module.exports = { hero, mob, mobSize, load };
