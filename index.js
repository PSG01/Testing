require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  REST,
  Routes,
} = require("discord.js");
const { LavalinkManager } = require("lavalink-client");
const {
  getConfig,
  setConfig,
  getAll,
  buildView,
  buildQueueView,
  buildChartMenu,
} = require("./music-channel");
const { getAllCharts, fetchAppleChart } = require("./charts-source");
const autoplay = require("./autoplay");
const musicStats = require("./music-stats");
const casino = require("./casino");
const rpg = require("./sts-commands");

const MUSIC_CMDS = new Set([
  "플리",
  "재생", "스킵", "일시정지", "다시재생", "정지", "재생목록", "재생정보", "볼륨", "반복", "이동", "필터", "자동재생", "음악랭킹",
]);

// ── 클라이언트 ─────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  if ("data" in command && "execute" in command)
    client.commands.set(command.data.name, command);
  else console.warn(`[경고] ${file} 에 data 또는 execute 가 없습니다.`);
}

// 슬래시 명령어 JSON (서버별 즉시 등록에 사용)
const commandData = [
  ...[...client.commands.values()].map((c) => c.data.toJSON()),
  ...casino.commandsJSON,
  ...rpg.commandsJSON,
];
// 안전장치: 모듈(음악/카지노/던전)을 합친 전체 네임스페이스에서 이름 중복 검사.
// 중복이 있으면 디스코드가 등록을 전부 거부하므로, 시작 시점에 크게 알리고 뒤의 것을 제외한다.
{
  const seen = new Map();
  for (let i = commandData.length - 1; i >= 0; i--) {
    const n = commandData[i].name;
    if (seen.has(n)) {
      console.error(`🚨 명령어 이름 중복: /${n} — 나중에 정의된 쪽을 제외하고 등록합니다. 코드에서 한쪽을 제거하세요!`);
      commandData.splice(seen.get(n), 1);
    }
    seen.set(n, i);
  }
}
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// 특정 서버에 명령어를 즉시 등록 (전역 반영 1시간을 안 기다려도 됨)
async function registerGuildCommands(guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
      body: commandData,
    });
    return true;
  } catch (e) {
    console.error(`명령어 등록 실패 (${guildId}):`, e?.message);
    return false;
  }
}

// ── Lavalink ───────────────────────────────────────────────────────
client.lavalink = new LavalinkManager({
  nodes: [
    {
      id: "main",
      host: process.env.LAVALINK_HOST || "localhost",
      port: Number(process.env.LAVALINK_PORT) || 2333,
      authorization: process.env.LAVALINK_PASSWORD || "youshallnotpass",
      secure: process.env.LAVALINK_SECURE === "true",
    },
  ],
  sendToShard: (guildId, payload) =>
    client.guilds.cache.get(guildId)?.shard?.send(payload),
  client: { id: process.env.CLIENT_ID, username: "MusicBot" },
  autoSkip: true,
  playerOptions: {
    defaultSearchPlatform: "ytsearch",
    onDisconnect: { autoReconnect: true, destroyPlayer: false },
    onEmptyQueue: { destroyAfterMs: 300_000 },
  },
});

client.on("raw", (d) => client.lavalink.sendRawData(d));

// ── 고정 패널 갱신 ─────────────────────────────────────────────────
const panelMessages = new Map();

async function getPanelMessage(guild) {
  const cfg = getConfig(guild.id);
  if (!cfg) return null;
  // 캐시가 현재 설정과 일치할 때만 사용 (셋업 재실행/패널 재생성 시 옛 메시지 무효화)
  const cached = panelMessages.get(guild.id);
  if (cached && cached.id === cfg.messageId && cached.channelId === cfg.channelId) return cached;
  panelMessages.delete(guild.id);
  const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
  const msg = ch ? await ch.messages.fetch(cfg.messageId).catch(() => null) : null;
  if (msg) panelMessages.set(guild.id, msg);
  return msg;
}

// 패널을 채널 맨 아래에 새로 띄움 (기존 패널은 삭제) — 설정/캐시 갱신 포함
async function recreatePanel(guild) {
  const cfg = getConfig(guild.id);
  if (!cfg) return null;
  const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
  if (!ch) return null;
  const old = await ch.messages.fetch(cfg.messageId).catch(() => null);
  if (old) await old.delete().catch(() => {});
  const msg = await ch.send(buildView(client.lavalink.getPlayer(guild.id))).catch(() => null);
  if (msg) {
    setConfig(guild.id, cfg.channelId, msg.id);
    panelMessages.set(guild.id, msg);
  }
  return msg;
}

async function refreshPanel(guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild || !getConfig(guildId)) return;
  const msg = await getPanelMessage(guild);
  if (!msg) return recreatePanel(guild); // 패널이 사라졌으면 재생성
  const player = client.lavalink.getPlayer(guildId);
  try {
    await msg.edit(buildView(player));
  } catch (e) {
    if (e?.code === 10008) return recreatePanel(guild); // Unknown Message → 재생성
    console.error("패널 갱신 실패:", e?.message);
  }
}

// 패널이 채널 맨 아래 메시지가 되도록 보장 (다른 메시지가 쌓이면 다시 내려 붙임)
async function ensurePanelBottom(guild) {
  const cfg = getConfig(guild.id);
  if (!cfg) return;
  const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
  if (!ch) return;
  if (ch.lastMessageId && ch.lastMessageId !== cfg.messageId) await recreatePanel(guild);
  else await refreshPanel(guild.id);
}

// 진행바 등 주기 갱신 — 전역 단일 타이머 (재시작/이벤트 누락에도 견고)
setInterval(() => {
  // 고정 채널 패널
  for (const guildId of Object.keys(getAll())) {
    const p = client.lavalink?.getPlayer?.(guildId);
    if (p?.queue?.current && !p.paused) refreshPanel(guildId).catch(() => {});
  }
  // 고정 채널이 없는 서버의 임시 플레이어 메시지
  for (const [guildId, msg] of nowPlayingMessages) {
    if (getConfig(guildId)) { nowPlayingMessages.delete(guildId); continue; }
    const p = client.lavalink?.getPlayer?.(guildId);
    if (p?.queue?.current && !p.paused)
      msg.edit(buildView(p)).catch(() => nowPlayingMessages.delete(guildId));
  }
}, 8000);

// ── Lavalink 이벤트 ────────────────────────────────────────────────
client.lavalink.nodeManager
  .on("connect", (node) => console.log(`✅ Lavalink 노드 연결됨: ${node.id}`))
  .on("error", (node, err) => console.error(`❌ Lavalink 오류 (${node.id}):`, err?.message));

// 고정 채널 설정이 없는 서버용: 곡마다 새 임베드를 쌓지 않고 한 메시지를 유지/갱신
const nowPlayingMessages = new Map();

client.lavalink.on("trackStart", async (player) => {
  const cur = player.queue?.current;
  if (cur) {
    autoplay.markPlayed(player.guildId, cur.info?.identifier);
    lastTracks.set(player.guildId, cur);
    musicStats.recordPlay(player.guildId, cur, cur.requester);
  }
  if (getConfig(player.guildId)) {
    const guild = client.guilds.cache.get(player.guildId);
    if (guild) await ensurePanelBottom(guild); // 곡 시작 시 패널을 맨 아래로 + 즉시 갱신
  } else {
    console.log(`ℹ️ 음악 채널 설정이 없어 임시 플레이어로 표시합니다 (guild ${player.guildId}) — /셋업 으로 고정 채널을 지정하세요.`);
    const ch = client.channels.cache.get(player.textChannelId);
    if (!ch) return;
    const old = nowPlayingMessages.get(player.guildId);
    if (old) await old.delete().catch(() => {});
    const msg = await ch.send(buildView(player)).catch(() => null);
    if (msg) nowPlayingMessages.set(player.guildId, msg);
  }
});
// 자동재생: 마지막 곡 기반으로 비슷한 곡을 찾아 이어 재생
const lastTracks = new Map();
async function tryAutoplay(player) {
  const last = lastTracks.get(player.guildId);
  if (!last) return false;
  try {
    const ident = last.info?.identifier;
    let tracks = [];
    if (ident && (last.info.sourceName === "youtube" || !last.info.sourceName)) {
      // 유튜브 믹스(RD) 재생목록 = "이 곡과 비슷한 곡" 라디오
      const res = await player.search({ query: `https://www.youtube.com/watch?v=${ident}&list=RD${ident}` }, last.requester).catch(() => null);
      tracks = res?.tracks || [];
    }
    if (!tracks.length) {
      const res = await player.search({ query: `${last.info.author || ""} ${last.info.title}`.slice(0, 80) }, last.requester).catch(() => null);
      tracks = res?.tracks || [];
    }
    const pick = tracks.find((t) => t.info.identifier !== ident && !autoplay.wasPlayed(player.guildId, t.info.identifier));
    if (!pick) return false;
    await player.queue.add(pick);
    await player.play();
    return true;
  } catch (e) {
    console.error("자동재생 실패:", e?.message);
    return false;
  }
}

client.lavalink.on("queueEnd", async (player) => {
  if (autoplay.isOn(player.guildId) && (await tryAutoplay(player))) return; // 라디오 계속
  if (getConfig(player.guildId)) await refreshPanel(player.guildId);
  else {
    const old = nowPlayingMessages.get(player.guildId);
    if (old) { await old.delete().catch(() => {}); nowPlayingMessages.delete(player.guildId); }
    client.channels.cache.get(player.textChannelId)?.send("⏹️ 재생 목록의 노래를 모두 들었어요.").catch(() => {});
  }
});
client.lavalink.on("playerDestroy", async (player) => {
  await refreshPanel(player.guildId);
});

// ── 공용 재생 함수 ─────────────────────────────────────────────────
function ensurePlayer({ guild, voiceChannel, textChannel }) {
  let player = client.lavalink.getPlayer(guild.id);
  if (!player) {
    player = client.lavalink.createPlayer({
      guildId: guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
      selfDeaf: true,
      volume: 80,
    });
  }
  return player;
}

async function playQuery({ guild, voiceChannel, textChannel, query, requester }) {
  // 음악 채널 미설정 시 재생 차단 (검색/차트 등 모든 경로 공통)
  if (!getConfig(guild.id)) return { ok: false, msg: "`/셋업` 으로 먼저 채널을 지정해주세요." };
  const player = ensurePlayer({ guild, voiceChannel, textChannel });
  if (!player.connected) await player.connect();

  const res = await player.search({ query }, requester);
  if (!res || !res.tracks?.length) return { ok: false, msg: "검색 결과가 없어요." };

  if (res.loadType === "playlist") await player.queue.add(res.tracks);
  else await player.queue.add(res.tracks[0]);

  if (!player.playing && !player.paused) await player.play();
  return {
    ok: true,
    playlist: res.loadType === "playlist",
    count: res.tracks.length,
    title: res.tracks[0]?.info?.title,
  };
}

// ── 인터랙션 라우터 ────────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (casino.commandNames.has(interaction.commandName)) return await casino.handleCommand(interaction);
      if (rpg.commandNames.has(interaction.commandName)) return await rpg.handleCommand(interaction);
      return await onCommand(interaction);
    }
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("music_")) return await onMusicButton(interaction);
      if (interaction.customId.startsWith("q_")) return await onQueueButton(interaction);
      if (interaction.customId.startsWith("sts_") && (await rpg.handleButton(interaction))) return;
      if (await casino.handleButton(interaction)) return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "chart_select")
      return await onChartSelect(interaction);
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "music_search_modal") return await onSearchModal(interaction);
      if (interaction.customId.startsWith("q_delmodal_")) return await onDeleteModal(interaction);
    }
  } catch (err) {
    console.error("⚠️ 인터랙션 오류:", err);
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred)
        interaction.editReply({ content: "⚠️ 처리 중 오류가 발생했어요." }).catch(() => {});
      else interaction.reply({ content: "⚠️ 처리 중 오류가 발생했어요.", flags: 64 }).catch(() => {});
    }
  }
});

// ── 전역 에러 가드: 어떤 에러가 나도 봇 프로세스는 살아있게 ───────
client.on("error", (err) => console.error("⚠️ 클라이언트 오류(무시하고 계속):", err?.message || err));
process.on("unhandledRejection", (err) => console.error("⚠️ 미처리 Promise 오류(무시하고 계속):", err?.message || err));
process.on("uncaughtException", (err) => console.error("⚠️ 미처리 예외(무시하고 계속):", err?.message || err));

async function onCommand(interaction) {
  const cfg = getConfig(interaction.guildId);
  // 음악 채널 미설정 시 음악 기능 차단
  if (!cfg && MUSIC_CMDS.has(interaction.commandName))
    return interaction.reply({
      content: "⚠️ `/셋업` 으로 먼저 채널을 지정해주세요.",
      flags: 64,
    });
  if (cfg && MUSIC_CMDS.has(interaction.commandName) && interaction.channelId !== cfg.channelId)
    return interaction.reply({
      content: `⚠️ 음악 명령은 <#${cfg.channelId}> 에서만 사용할 수 있어요.`,
      flags: 64,
    });
  const command = client.commands.get(interaction.commandName);
  if (command) await command.execute(interaction, client);
}

async function onMusicButton(interaction) {
  // 재생 중이 아니어도 가능한 버튼
  if (interaction.customId === "music_search") {
    const modal = new ModalBuilder().setCustomId("music_search_modal").setTitle("음악 검색");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("query")
          .setLabel("노래 제목 또는 링크")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }
  if (interaction.customId === "music_chart") {
    const menu = buildChartMenu();
    if (!menu)
      return interaction.reply({
        content: "⚠️ 등록된 차트가 없어요. `charts.json` 에 차트를 추가하세요.",
        flags: 64,
      });
    return interaction.reply({ ...menu, flags: 64 });
  }

  const player = client.lavalink.getPlayer(interaction.guildId);
  if (!player || !player.queue.current)
    return interaction.reply({ content: "⚠️ 재생 중인 곡이 없어요.", flags: 64 });

  const mc = interaction.member?.voice?.channel;
  if (!mc || mc.id !== player.voiceChannelId)
    return interaction.reply({
      content: "⚠️ 봇과 같은 음성 채널에 있어야 사용할 수 있어요.",
      flags: 64,
    });

  switch (interaction.customId) {
    case "music_pause":
      player.paused ? await player.resume() : await player.pause();
      return interaction.update(buildView(player));
    case "music_skip":
      await interaction.deferUpdate();
      if (player.queue.tracks.length > 0) await player.skip();
      else await player.stopPlaying(true, false);
      return;
    case "music_stop":
      await interaction.deferUpdate();
      return player.destroy();
    case "music_loop": {
      const next = { off: "track", track: "queue", queue: "off" }[player.repeatMode] || "track";
      await player.setRepeatMode(next);
      return interaction.update(buildView(player));
    }
    case "music_shuffle":
      player.queue.shuffle();
      return interaction.reply({ content: "🔀 재생 목록을 섞었어요.", flags: 64 });
    case "music_voldown":
      await player.setVolume(Math.max(0, player.volume - 10));
      return interaction.update(buildView(player));
    case "music_volup":
      await player.setVolume(Math.min(150, player.volume + 10));
      return interaction.update(buildView(player));
    case "music_queue":
      return interaction.reply({ ...buildQueueView(player, 0), flags: 64 });
    default:
      return interaction.deferUpdate();
  }
}

// 큐 페이지네이션 버튼 (q_go_<page>, q_del_<page>)
async function onQueueButton(interaction) {
  const parts = interaction.customId.split("_"); // ["q","go","2"]
  const action = parts[1];
  const page = parseInt(parts[2], 10) || 0;
  const player = client.lavalink.getPlayer(interaction.guildId);

  if (action === "go") {
    if (!player)
      return interaction.update({ content: "재생이 종료됐어요.", embeds: [], components: [] });
    return interaction.update(buildQueueView(player, page));
  }
  if (action === "del") {
    const mc = interaction.member?.voice?.channel;
    if (!player || !mc || mc.id !== player.voiceChannelId)
      return interaction.reply({
        content: "⚠️ 봇과 같은 음성 채널에서만 삭제할 수 있어요.",
        flags: 64,
      });
    const modal = new ModalBuilder().setCustomId(`q_delmodal_${page}`).setTitle("대기열에서 삭제");
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nums")
          .setLabel("삭제할 번호 (예: 3  또는  2,5,7)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }
}

async function onDeleteModal(interaction) {
  const page = parseInt(interaction.customId.split("_")[2], 10) || 0;
  const player = client.lavalink.getPlayer(interaction.guildId);
  if (!player) return interaction.reply({ content: "재생이 종료됐어요.", flags: 64 });

  const raw = interaction.fields.getTextInputValue("nums");
  const nums = [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 1)
    ),
  ];
  // 1-based 번호 → 인덱스. 뒤에서부터 제거해야 인덱스가 안 밀림.
  const positions = nums
    .map((n) => n - 1)
    .filter((i) => i < player.queue.tracks.length)
    .sort((a, b) => b - a);
  for (const i of positions) player.queue.tracks.splice(i, 1);

  return interaction.update(buildQueueView(player, page));
}

async function onSearchModal(interaction) {
  const query = interaction.fields.getTextInputValue("query");
  const voice = interaction.member?.voice?.channel;
  if (!voice) return interaction.reply({ content: "⚠️ 먼저 음성 채널에 들어가 주세요.", flags: 64 });
  await interaction.deferReply({ flags: 64 });
  const r = await playQuery({
    guild: interaction.guild,
    voiceChannel: voice,
    textChannel: interaction.channel,
    query,
    requester: interaction.user,
  });
  return interaction.editReply(
    r.ok ? (r.playlist ? `📃 플레이리스트 ${r.count}곡을 재생 목록에 담았어요` : `➕ **${r.title}** 을(를) 재생 목록에 담았어요`) : `❌ ${r.msg}`
  );
}

async function onChartSelect(interaction) {
  const chart = getAllCharts().find((c) => c.id === interaction.values[0]);
  const voice = interaction.member?.voice?.channel;
  if (!chart) return interaction.update({ content: "차트를 찾을 수 없어요.", components: [] });
  if (!voice) return interaction.update({ content: "⚠️ 먼저 음성 채널에 들어가 주세요.", components: [] });

  await interaction.update({ content: `⏳ **${chart.label}** 불러오는 중...`, components: [] });

  // 사용자가 charts.json 에 넣은 재생목록
  if (chart.type === "playlist") {
    const r = await playQuery({
      guild: interaction.guild,
      voiceChannel: voice,
      textChannel: interaction.channel,
      query: chart.url,
      requester: interaction.user,
    });
    return interaction.editReply(
      r.ok ? `📈 **${chart.label}** — ${r.count}곡을 재생 목록에 담았어요` : `❌ ${r.msg} (charts.json url 확인)`
    );
  }

  // 자동 갱신 차트 (Apple RSS): 제목+아티스트 목록 → 각 곡 YouTube 검색 후 큐 추가
  let songs;
  try {
    songs = await fetchAppleChart(chart.country, chart.limit);
  } catch (e) {
    return interaction.editReply(`❌ 차트를 가져오지 못했어요: ${e.message}`);
  }
  if (!songs.length) return interaction.editReply("❌ 차트가 비어 있어요.");

  const player = ensurePlayer({
    guild: interaction.guild,
    voiceChannel: voice,
    textChannel: interaction.channel,
  });
  if (!player.connected) await player.connect();

  let added = 0;
  for (const s of songs) {
    try {
      const res = await player.search({ query: `${s.title} ${s.artist}` }, interaction.user);
      if (res?.tracks?.length) {
        await player.queue.add(res.tracks[0]);
        added++;
        if (!player.playing && !player.paused) await player.play(); // 첫 곡은 즉시 재생
      }
    } catch {
      /* 개별 곡 검색 실패는 건너뜀 */
    }
  }
  return interaction.editReply(
    added ? `📈 **${chart.label}** — ${added}곡을 재생 목록에 담았어요! (매일 자동 갱신)` : "❌ 재생 가능한 곡을 찾지 못했어요."
  );
}

// ── 음악 채널 입력 = 재생 요청 ─────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  const cfg = getConfig(message.guild.id);
  if (!cfg || message.channel.id !== cfg.channelId) return;

  const query = message.content.trim();
  await message.delete().catch(() => {});
  if (!query) return;

  const voice = message.member?.voice?.channel;
  const notify = async (text) => {
    const m = await message.channel.send(`<@${message.author.id}> ${text}`).catch(() => null);
    if (m) setTimeout(() => m.delete().catch(() => {}), 6000);
  };
  if (!voice) return notify("먼저 음성 채널에 들어가 주세요.");

  const r = await playQuery({
    guild: message.guild,
    voiceChannel: voice,
    textChannel: message.channel,
    query,
    requester: message.author,
  });
  await notify(r.ok ? (r.playlist ? `📃 플레이리스트 ${r.count}곡 추가!` : `➕ ${r.title}`) : `❌ ${r.msg}`);
  // 대기곡 추가 등 변경사항 반영 + 패널을 맨 아래로 유지
  return ensurePanelBottom(message.guild);
});

// ── 새 서버에 초대되면 그 서버에 명령어 즉시 등록 ─────────────────
client.on("guildCreate", async (guild) => {
  const ok = await registerGuildCommands(guild.id);
  if (ok) console.log(`🆕 새 서버 명령어 즉시 등록 완료: ${guild.name} (${guild.id})`);
});

// ── 준비 완료 ──────────────────────────────────────────────────────
client.once("ready", async () => {
  console.log(`🤖 로그인 완료: ${client.user.tag}`);
  client.lavalink.init({ id: client.user.id, username: client.user.username });

  // 이미 들어가 있는 모든 서버에 명령어 즉시 등록
  for (const [guildId] of client.guilds.cache) await registerGuildCommands(guildId);
  console.log(`📋 ${client.guilds.cache.size}개 서버에 명령어 등록 완료`);

  // 예전 전역 등록으로 인한 중복 방지: 전역 명령어 비우기 (한 번만 해두면 됨)
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
  } catch (e) {
    console.error("전역 명령어 정리 실패:", e?.message);
  }

  for (const [guildId, cfg] of Object.entries(getAll())) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!ch) continue;
    let msg = await ch.messages.fetch(cfg.messageId).catch(() => null);
    if (!msg) {
      msg = await ch.send(buildView(null)).catch(() => null);
      if (msg) setConfig(guildId, cfg.channelId, msg.id);
    } else {
      await msg.edit(buildView(client.lavalink.getPlayer(guildId))).catch(() => {});
    }
    if (msg) panelMessages.set(guildId, msg);
  }
});

client.login(process.env.DISCORD_TOKEN);
