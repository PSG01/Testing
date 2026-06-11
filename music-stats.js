// ── 음악 재생 통계 (서버별 최다 재생곡 / 최다 신청자) ──────────────
const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "data", "music-stats.json");
function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}
function persist(o) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(o));
}

function recordPlay(guildId, track, requester) {
  if (!guildId || !track?.info?.title) return;
  const d = load();
  const g = (d[guildId] ||= { songs: {}, users: {} });
  const key = track.info.title.slice(0, 80);
  const s = (g.songs[key] ||= { count: 0, author: track.info.author || "" });
  s.count++;
  if (requester?.id) {
    const u = (g.users[requester.id] ||= { name: "", count: 0 });
    u.count++;
    u.name = requester.username || requester.name || u.name || "?";
  }
  persist(d);
}

function top(guildId, n = 10) {
  const g = load()[guildId] || { songs: {}, users: {} };
  const songs = Object.entries(g.songs)
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
  const users = Object.entries(g.users)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
  return { songs, users };
}

module.exports = { recordPlay, top };
