const fs = require("node:fs");
const path = require("node:path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { msToTime } = require("./utils");
const { getAllCharts } = require("./charts-source");

// ── 음악 채널 설정 저장소 (guildId -> { channelId, messageId }) ─────
// .env 의 MUSIC_CHANNELS 를 1순위로 사용 — 코드 파일을 통째로 교체해도
// 토큰과 함께 .env 만 유지하면 /셋업 을 다시 할 필요가 없다.
const FILE = path.join(__dirname, "data", "music-channels.json");
const ENV_FILE = path.join(__dirname, ".env");
const ENV_KEY = "MUSIC_CHANNELS";
function load() {
  try {
    if (process.env[ENV_KEY]) return JSON.parse(process.env[ENV_KEY]);
  } catch {}
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")); // 구버전(data/) 마이그레이션용
  } catch {
    return {};
  }
}
function persist(obj) {
  const json = JSON.stringify(obj);
  process.env[ENV_KEY] = json;
  // .env 의 MUSIC_CHANNELS 줄을 갱신(없으면 추가) — 다른 줄은 그대로 보존
  try {
    let txt = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
    const line = `${ENV_KEY}='${json}'`;
    if (new RegExp(`^${ENV_KEY}=`, "m").test(txt)) txt = txt.replace(new RegExp(`^${ENV_KEY}=.*$`, "m"), line);
    else txt += (txt === "" || txt.endsWith("\n") ? "" : "\n") + line + "\n";
    fs.writeFileSync(ENV_FILE, txt);
  } catch (e) {
    console.error("⚠️ .env 저장 실패(설정은 data/에 백업됨):", e?.message);
  }
  // data/ 에도 백업 유지
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(obj, null, 2));
  } catch {}
}
function getConfig(guildId) {
  return load()[guildId] || null;
}
function setConfig(guildId, channelId, messageId) {
  const o = load();
  o[guildId] = { channelId, messageId };
  persist(o);
}
function getAll() {
  return load();
}

// ── 인기차트 목록 (charts.json) ────────────────────────────────────
function getCharts() {
  try {
    const arr = JSON.parse(fs.readFileSync(path.join(__dirname, "charts.json"), "utf8"));
    return Array.isArray(arr) ? arr.filter((c) => c && c.label && c.url) : [];
  } catch {
    return [];
  }
}

// ── 표시 유틸 ──────────────────────────────────────────────────────
const LOOP_EMOJI = { off: "➡️", track: "🔂", queue: "🔁" };
const LOOP_LABEL = { off: "꺼짐", track: "한 곡", queue: "전체" };
const QUEUE_PAGE_SIZE = 10;

function trim(str, n) {
  return str && str.length > n ? str.slice(0, n - 1) + "…" : str || "";
}
function progressBar(position, duration, size = 18) {
  if (!duration || duration <= 0) return "🔴 라이브";
  const pos = Math.min(Math.max(0, position), duration); // 로컬 보간이 곡 길이를 넘지 않게
  const ratio = pos / duration;
  const filled = Math.round(ratio * size);
  return (
    "━".repeat(filled) +
    "🔘" +
    "━".repeat(Math.max(0, size - filled)) +
    `\n\`${msToTime(pos)} / ${msToTime(duration)}\``
  );
}
function btn(id, emoji, style, disabled, label) {
  const b = new ButtonBuilder().setCustomId(id).setEmoji(emoji).setStyle(style).setDisabled(!!disabled);
  if (label) b.setLabel(label);
  return b;
}

// ── 메인 고정 패널 ────────────────────────────────────────────────
function buildView(player) {
  const idleImage = process.env.MUSIC_IDLE_IMAGE || null;
  const track = player?.queue?.current;
  const playing = !!track;

  const embed = new EmbedBuilder();
  if (!playing) {
    embed
      .setColor(0x2b2d31)
      .setTitle("🎵 음악 플레이어")
      .setDescription(
        "이 채널에 **노래 제목** 또는 **링크**를 입력하면 바로 재생돼요.\n" +
          "🔍 검색 · 📈 인기차트 버튼도 사용할 수 있어요.\n\n*대기 중...*"
      );
    if (idleImage) embed.setImage(idleImage);
  } else {
    const nextUp = player.queue.tracks.slice(0, 5);
    const nextText = nextUp.length
      ? nextUp.map((t, i) => `\`${i + 1}.\` ${trim(t.info.title, 40)}`).join("\n")
      : "*없음*";
    embed
      .setColor(0x5865f2)
      .setAuthor({ name: "지금 재생 중" })
      .setTitle(trim(track.info.title, 80))
      .setURL(track.info.uri || null)
      .setDescription(progressBar(player.position, track.info.duration))
      .addFields(
        { name: "아티스트", value: track.info.author || "알 수 없음", inline: true },
        { name: "볼륨", value: `${player.volume}%`, inline: true },
        { name: "반복", value: LOOP_LABEL[player.repeatMode] || "꺼짐", inline: true },
        { name: `다음 대기곡 (총 ${player.queue.tracks.length}곡)`, value: nextText }
      );
    if (track.info.artworkUrl) embed.setImage(track.info.artworkUrl);
    if (track.requester?.username) embed.setFooter({ text: `요청: ${track.requester.username}` });
  }

  const row1 = new ActionRowBuilder().addComponents(
    btn("music_pause", player?.paused ? "▶️" : "⏸️", ButtonStyle.Secondary, !playing),
    btn("music_skip", "⏭️", ButtonStyle.Secondary, !playing),
    btn("music_stop", "⏹️", ButtonStyle.Danger, !playing),
    btn("music_loop", LOOP_EMOJI[player?.repeatMode] || "➡️", ButtonStyle.Secondary, !playing),
    btn("music_shuffle", "🔀", ButtonStyle.Secondary, !playing)
  );
  const row2 = new ActionRowBuilder().addComponents(
    btn("music_voldown", "🔉", ButtonStyle.Secondary, !playing),
    btn("music_volup", "🔊", ButtonStyle.Secondary, !playing),
    btn("music_queue", "📋", ButtonStyle.Secondary, !playing, "재생 목록"),
    btn("music_search", "🔍", ButtonStyle.Success, false, "검색")
  );
  const row3 = new ActionRowBuilder().addComponents(
    btn("music_chart", "📈", ButtonStyle.Primary, false, "인기차트")
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

// ── 큐 페이지네이션 화면 (이전/다음/새로고침/삭제) ─────────────────
function buildQueueView(player, page = 0) {
  const tracks = player?.queue?.tracks ?? [];
  const totalPages = Math.max(1, Math.ceil(tracks.length / QUEUE_PAGE_SIZE));
  page = Math.min(Math.max(0, page), totalPages - 1);
  const start = page * QUEUE_PAGE_SIZE;
  const slice = tracks.slice(start, start + QUEUE_PAGE_SIZE);
  const current = player?.queue?.current;

  const lines = slice.length
    ? slice
        .map(
          (t, i) =>
            `\`${String(start + i + 1).padStart(2, " ")}.\` ${trim(t.info.title, 50)} — \`${
              t.info.isStream ? "LIVE" : msToTime(t.info.duration)
            }\``
        )
        .join("\n")
    : "*대기 중인 곡이 없어요.*";

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📋 재생 목록")
    .setDescription(
      (current ? `**지금 재생 중**\n${trim(current.info.title, 60)}\n\n` : "") +
        `**대기열 (${tracks.length}곡)**\n${lines}`
    )
    .setFooter({ text: `페이지 ${page + 1} / ${totalPages} · 🗑️ 삭제 시 번호 입력` });

  const nav = new ActionRowBuilder().addComponents(
    btn(`q_go_${page - 1}`, "◀️", ButtonStyle.Secondary, page <= 0),
    btn(`q_go_${page + 1}`, "▶️", ButtonStyle.Secondary, page >= totalPages - 1),
    btn(`q_go_${page}`, "🔄", ButtonStyle.Secondary, false),
    btn(`q_del_${page}`, "🗑️", ButtonStyle.Danger, tracks.length === 0, "삭제")
  );

  return { embeds: [embed], components: [nav] };
}

// ── 인기차트 선택 메뉴 ────────────────────────────────────────────
function buildChartMenu() {
  const charts = getAllCharts();
  if (!charts.length) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId("chart_select")
    .setPlaceholder("재생할 차트를 선택하세요")
    .addOptions(
      charts.slice(0, 25).map((c) => ({
        label: trim(c.label, 100),
        value: c.id,
        description: trim(c.desc || "", 100),
      }))
    );
  return {
    content: "📈 **인기차트** — 매일 자동 갱신되는 차트를 골라보세요",
    components: [new ActionRowBuilder().addComponents(menu)],
  };
}

module.exports = {
  getConfig,
  setConfig,
  getAll,
  getCharts,
  buildView,
  buildQueueView,
  buildChartMenu,
};
