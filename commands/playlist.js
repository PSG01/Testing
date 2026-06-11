const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { checkVoice, msToTime } = require("../utils");

const FILE = path.join(__dirname, "..", "data", "playlists.json");
const MAX_TRACKS = 200; // 플리당 최대 곡 수
const PAGE_SIZE = 10; // /플리 정보 페이지당 곡 수

// 재생목록 스타일 페이지 뷰 (◀️ ▶️ 로 넘김)
function infoView(ownerId, name, list, page = 0, expiresAt = Date.now() + 120_000) {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  page = Math.min(Math.max(0, page), totalPages - 1);
  const start = page * PAGE_SIZE;
  const lines = list.slice(start, start + PAGE_SIZE).map((t, i) => {
    const dur = t.info?.duration ? ` — \`${msToTime(t.info.duration)}\`` : "";
    return `\`${String(start + i + 1).padStart(3, " ")}.\` ${t.title.slice(0, 55)}${dur}`;
  });
  const totalMs = list.reduce((a, t) => a + (t.info?.duration || 0), 0);
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📃 ${name} (${list.length}곡${totalMs ? ` · ${msToTime(totalMs)}` : ""})`)
    .setDescription(`⏳ <t:${Math.floor(expiresAt / 1000)}:R> 자동 삭제\n\n` + (lines.join("\n") || "*비어 있어요*"))
    .setFooter({ text: `페이지 ${page + 1} / ${totalPages} · /플리 재생 ${name} 으로 전부 담기` });
  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pl_info_${ownerId}_${page - 1}_${expiresAt}_${name}`).setEmoji("◀️").setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`pl_info_${ownerId}_${page + 1}_${expiresAt}_${name}`).setEmoji("▶️").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
  return { embeds: [embed], components: [nav] };
}
function load() { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } }
function save(d) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d)); }

module.exports = {
  data: new SlashCommandBuilder()
    .setName("플리")
    .setDescription("내 플레이리스트를 저장/재생/관리합니다 📃")
    .addSubcommand((s) =>
      s.setName("저장").setDescription("지금 재생 중인 곡과 재생 목록을 플레이리스트로 저장합니다")
        .addStringOption((o) => o.setName("이름").setDescription("플레이리스트 이름").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("재생").setDescription("저장해 둔 플레이리스트를 재생 목록에 담습니다")
        .addStringOption((o) => o.setName("이름").setDescription("플레이리스트 이름").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("추가").setDescription("지금 재생 중인 곡 한 곡을 플레이리스트에 추가합니다")
        .addStringOption((o) => o.setName("이름").setDescription("플레이리스트 이름 (없으면 새로 만듦)").setRequired(true)))
    .addSubcommand((s) =>
      s.setName("정보").setDescription("플레이리스트에 담긴 곡 목록을 봅니다")
        .addStringOption((o) => o.setName("이름").setDescription("플레이리스트 이름").setRequired(true)))
    .addSubcommand((s) => s.setName("목록").setDescription("내 플레이리스트 목록을 봅니다"))
    .addSubcommand((s) =>
      s.setName("삭제").setDescription("플레이리스트를 삭제합니다")
        .addStringOption((o) => o.setName("이름").setDescription("플레이리스트 이름").setRequired(true))),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const all = load();
    const mine = (all[userId] = all[userId] || {});

    if (sub === "저장") {
      const name = interaction.options.getString("이름").slice(0, 30);
      const player = client.lavalink.getPlayer(interaction.guild.id);
      if (!player || (!player.queue.current && player.queue.tracks.length === 0))
        return interaction.reply({ content: "⚠️ 저장할 곡이 없어요. 먼저 노래를 재생해 주세요.", flags: 64 });
      // encoded(라발링크 트랙 원본)까지 저장 → 재생 시 검색 없이 즉시 복원
      const pack = (t) => ({ title: t.info.title, uri: t.info.uri, encoded: t.encoded, info: t.info, pluginInfo: t.pluginInfo || {} });
      const tracks = [];
      if (player.queue.current) tracks.push(pack(player.queue.current));
      for (const t of player.queue.tracks) tracks.push(pack(t));
      // 같은 이름의 플리가 있으면 덮어쓰지 않고 "없는 곡만 추가"
      const existing = (mine[name] = mine[name] || []);
      const had = existing.length;
      const have = new Set(existing.map((t) => t.uri));
      let addedNew = 0;
      for (const t of tracks) {
        if (have.has(t.uri) || existing.length >= MAX_TRACKS) continue;
        existing.push(t);
        have.add(t.uri);
        addedNew++;
      }
      save(all);
      const full = existing.length >= MAX_TRACKS ? `\n⚠️ 플리가 가득 차서(최대 ${MAX_TRACKS}곡) 일부는 담지 못했어요.` : "";
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("📃 플레이리스트 저장")
        .setDescription(had
          ? `**${name}** — 기존 ${had}곡에 새 곡 **${addedNew}곡** 추가 (중복 제외 · 총 ${existing.length}곡)${full}`
          : `**${name}** — ${existing.length}곡 저장 완료${full}\n\`/플리 재생 ${name}\` 으로 불러올 수 있어요.`)] });
    }

    if (sub === "추가") {
      const name = interaction.options.getString("이름").slice(0, 30);
      const player = client.lavalink.getPlayer(interaction.guild.id);
      const cur = player?.queue?.current;
      if (!cur) return interaction.reply({ content: "⚠️ 지금 재생 중인 곡이 없어요.", flags: 64 });
      const list = (mine[name] = mine[name] || []);
      if (list.some((t) => t.uri === cur.info.uri))
        return interaction.reply({ content: `⚠️ **${cur.info.title}** 은(는) 이미 **${name}** 플리에 있어요.`, flags: 64 });
      if (list.length >= MAX_TRACKS)
        return interaction.reply({ content: `⚠️ **${name}** 플리가 가득 찼어요. (최대 ${MAX_TRACKS}곡)`, flags: 64 });
      list.push({ title: cur.info.title, uri: cur.info.uri, encoded: cur.encoded, info: cur.info, pluginInfo: cur.pluginInfo || {} });
      save(all);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle("📃 한 곡 추가")
        .setDescription(`**${cur.info.title}**\n→ **${name}** 플리에 담았어요. (총 ${list.length}곡)`)] });
    }

    if (sub === "정보") {
      const name = interaction.options.getString("이름");
      const list = mine[name];
      if (!list || !list.length) return interaction.reply({ content: `⚠️ **${name}** 플레이리스트가 없어요. \`/플리 목록\` 으로 확인해 보세요.`, flags: 64 });
      return interaction.reply(infoView(userId, name, list, 0));
    }

    if (sub === "목록") {
      const names = Object.keys(mine);
      if (!names.length) return interaction.reply({ content: "📃 저장된 플레이리스트가 없어요. `/플리 저장 [이름]` 으로 만들어 보세요.", flags: 64 });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("📃 내 플레이리스트")
        .setDescription(names.map((n) => `• **${n}** (${mine[n].length}곡)`).join("\n"))] });
    }

    if (sub === "삭제") {
      const name = interaction.options.getString("이름");
      if (!mine[name]) return interaction.reply({ content: `⚠️ **${name}** 플레이리스트가 없어요.`, flags: 64 });
      delete mine[name];
      save(all);
      return interaction.reply({ content: `🗑️ **${name}** 플레이리스트를 삭제했어요.` });
    }

    if (sub === "재생") {
      const name = interaction.options.getString("이름");
      const list = mine[name];
      if (!list || !list.length) return interaction.reply({ content: `⚠️ **${name}** 플레이리스트가 없어요. \`/플리 목록\` 으로 확인해 보세요.`, flags: 64 });
      const voiceCheck = checkVoice(interaction);
      if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });
      await interaction.deferReply();

      let player = client.lavalink.getPlayer(interaction.guild.id);
      if (!player) {
        player = client.lavalink.createPlayer({
          guildId: interaction.guild.id,
          voiceChannelId: interaction.member.voice.channel.id,
          textChannelId: interaction.channel.id,
          selfDeaf: true,
          volume: 80,
        });
      }
      if (!player.connected) await player.connect();

      let added = 0;
      const instant = []; // encoded 저장본 → 검색 없이 즉시 복원
      const needSearch = []; // 구버전 저장본(제목/URL만) → 검색 필요
      for (const t of list) (t.encoded ? instant : needSearch).push(t);

      const instantTracks = [];
      for (const t of instant) {
        try {
          instantTracks.push(client.lavalink.utils.buildTrack({ encoded: t.encoded, info: t.info, pluginInfo: t.pluginInfo || {} }, interaction.user));
        } catch { /* 한 곡 실패는 건너뜀 */ }
      }
      // 구버전 곡은 10곡씩 병렬 검색 (순차 검색 대비 ~10배)
      for (let i = 0; i < needSearch.length; i += 10) {
        const chunk = needSearch.slice(i, i + 10);
        const results = await Promise.all(chunk.map((t) => player.search({ query: t.uri }, interaction.user).catch(() => null)));
        for (const res of results) if (res?.tracks?.length) instantTracks.push(res.tracks[0]);
      }
      if (instantTracks.length) {
        await player.queue.add(instantTracks);
        added = instantTracks.length;
      }
      if (!player.playing && !player.paused) await player.play();
      return interaction.editReply(`📃 **${name}** — ${added}/${list.length}곡을 재생 목록에 담았어요.`);
    }
  },

  // ◀️ ▶️ 페이지 버튼 (index.js 라우터에서 pl_ 접두사로 연결)
  async handleButton(interaction) {
    if (!interaction.customId.startsWith("pl_info_")) return false;
    const parts = interaction.customId.split("_");
    const ownerId = parts[2];
    const page = parseInt(parts[3], 10) || 0;
    const expiresAt = parseInt(parts[4], 10) || Date.now() + 120_000;
    const name = parts.slice(5).join("_"); // 이름에 _ 가 있어도 안전
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "⚠️ 본인 플리만 넘겨볼 수 있어요. `/플리 정보` 로 직접 열어보세요!", flags: 64 });
      return true;
    }
    const list = load()[ownerId]?.[name];
    if (!list || !list.length) {
      await interaction.update({ content: `⚠️ **${name}** 플레이리스트를 찾을 수 없어요.`, embeds: [], components: [] });
      return true;
    }
    await interaction.update(infoView(ownerId, name, list, page, expiresAt));
    return true;
  },
};
