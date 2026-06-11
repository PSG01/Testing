// 공용 유틸 함수
const sharp = require("sharp");

// ── 렌더 공용: 2배 슈퍼샘플링 (SVG를 2배 해상도로 래스터화 후 다운스케일 → 안티앨리어싱) ──
function svgToPng(svg, w, h) {
  return sharp(Buffer.from(svg), { density: 144 }).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
}
// SVG 프레임 배열 → 애니메이션 GIF (loop:1, 프레임별 delay ms)
async function framesToGif(frames, delays, w, h) {
  const pngs = [];
  for (const svg of frames) pngs.push(await svgToPng(svg, w, h));
  const gif = await sharp(pngs, { join: { across: 1, animated: true } }).gif({ loop: 1, delay: delays }).toBuffer();
  return { gif, finalPng: pngs[pngs.length - 1], durationMs: delays.reduce((a, b) => a + b, 0) };
}

// ── 이징 모음 ──
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// 살짝 오버슈트 후 되돌아오는 탄성 정지 (슬롯 릴 등)
const easeOutBack = (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
// 바닥에 튕기는 감쇠 바운스 (주사위 착지 등)
const easeOutBounce = (t) => {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

// 시드 기반 의사 난수 (프레임 간 일관된 파티클 배치용)
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function msToTime(duration) {
  const sec = Math.floor((duration / 1000) % 60);
  const min = Math.floor((duration / (1000 * 60)) % 60);
  const hrs = Math.floor(duration / (1000 * 60 * 60));
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

// 명령 실행자가 봇과 같은 음성 채널에 있는지 확인.
// 문제 없으면 null, 문제 있으면 사용자에게 보여줄 메시지를 반환.
function checkVoice(interaction, player) {
  const memberChannel = interaction.member?.voice?.channel;
  if (!memberChannel) return "먼저 음성 채널에 들어가 주세요.";
  if (player && player.voiceChannelId && player.voiceChannelId !== memberChannel.id)
    return "봇과 같은 음성 채널에 있어야 사용할 수 있어요.";
  return null;
}

module.exports = { msToTime, checkVoice, svgToPng, framesToGif, easeOutCubic, easeOutBack, easeOutBounce, seededRand };
