const fs = require("node:fs");
const path = require("node:path");

// 자동 갱신 차트 (Apple Music 일간 인기곡 — 인증 불필요, 매일 자동 갱신)
const AUTO_CHARTS = [
  { id: "apple_kr", label: "🇰🇷 국내 인기곡 TOP 30", desc: "Apple Music 국내 일간차트(자동 갱신)", type: "apple", country: "kr", limit: 30 },
  { id: "apple_us", label: "🇺🇸 미국 인기곡 TOP 30", desc: "Apple Music US(자동 갱신)", type: "apple", country: "us", limit: 30 },
  { id: "apple_jp", label: "🇯🇵 일본 인기곡 TOP 30", desc: "Apple Music JP(자동 갱신)", type: "apple", country: "jp", limit: 30 },
];

// (선택) 사용자가 charts.json 에 직접 넣은 재생목록도 함께 노출
function getCustomCharts() {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(__dirname, "charts.json"), "utf8"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((c) => c && c.label && c.url)
      .map((c, i) => ({ id: `custom_${i}`, label: c.label, desc: c.desc || c.url, type: "playlist", url: c.url }));
  } catch {
    return [];
  }
}

function getAllCharts() {
  return [...AUTO_CHARTS, ...getCustomCharts()];
}

// Apple RSS 차트에서 (제목, 아티스트) 목록 가져오기
async function fetchAppleChart(country, limit) {
  if (typeof fetch !== "function")
    throw new Error("이 기능은 Node.js 18 이상이 필요합니다 (전역 fetch 미지원).");
  const url = `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${limit}/songs.json`;
  const res = await fetch(url, { headers: { "User-Agent": "discord-music-bot" } });
  if (!res.ok) throw new Error(`차트 요청 실패 (HTTP ${res.status})`);
  const json = await res.json();
  const results = json?.feed?.results || [];
  return results.map((r) => ({ title: r.name, artist: r.artistName }));
}

module.exports = { AUTO_CHARTS, getAllCharts, fetchAppleChart };
