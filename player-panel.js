const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { msToTime } = require("./utils");

// 반복 모드별 표시
const LOOP_EMOJI = { off: "➡️", track: "🔂", queue: "🔁" };
const LOOP_LABEL = { off: "반복 꺼짐", track: "한 곡 반복", queue: "전체 반복" };

/**
 * 현재 플레이어 상태로 임베드 + 버튼 2줄을 만들어 반환합니다.
 * @param {object} player lavalink-client Player
 * @param {object} opts { disabled, ended }
 */
function buildPanel(player, opts = {}) {
  const { disabled = false, ended = false } = opts;
  const track = player.queue?.current;

  const embed = new EmbedBuilder().setColor(ended ? 0x4f545c : 0x5865f2);

  if (ended || !track) {
    embed.setTitle("⏹️ 재생 종료").setDescription("재생 목록이 비었거나 재생이 멈췄어요.");
  } else {
    embed
      .setTitle("🎵 플레이어")
      .setDescription(`**[${track.info.title}](${track.info.uri})**`)
      .addFields(
        { name: "아티스트", value: track.info.author || "알 수 없음", inline: true },
        {
          name: "길이",
          value: track.info.isStream ? "🔴 라이브" : msToTime(track.info.duration),
          inline: true,
        },
        { name: "볼륨", value: `${player.volume}%`, inline: true },
        {
          name: "반복",
          value: LOOP_LABEL[player.repeatMode] || "반복 꺼짐",
          inline: true,
        },
        {
          name: "대기 곡",
          value: `${player.queue?.tracks?.length ?? 0}곡`,
          inline: true,
        }
      );
    if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
    if (track.requester?.username)
      embed.setFooter({ text: `요청: ${track.requester.username}` });
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setEmoji(player.paused ? "▶️" : "⏸️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("music_loop")
      .setEmoji(LOOP_EMOJI[player.repeatMode] || "➡️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_voldown")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_volup")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_queue")
      .setLabel("재생 목록")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Primary)
  );

  if (disabled || ended) {
    for (const b of row1.components) b.setDisabled(true);
    for (const b of row2.components) b.setDisabled(true);
  }

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = { buildPanel };
