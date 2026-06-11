const { SlashCommandBuilder } = require("discord.js");
const { checkVoice, msToTime } = require("../utils");

// "1:30", "01:02:03", "90" → ms (잘못된 형식이면 null)
function parseTime(str) {
  const parts = str.trim().split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p)) || parts.length > 3) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + parseInt(p, 10);
  return sec * 1000;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("이동")
    .setDescription("재생 중인 곡의 특정 시간으로 점프합니다.")
    .addStringOption((o) =>
      o
        .setName("시간")
        .setDescription("이동할 위치 — 예: 1:30 (1분 30초), 90 (90초), 1:02:03")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중이 아니에요.", ephemeral: true });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, ephemeral: true });

    const track = player.queue.current;
    if (track.info.isStream)
      return interaction.reply({ content: "⚠️ 라이브 스트림은 구간 이동을 할 수 없어요.", ephemeral: true });

    const pos = parseTime(interaction.options.getString("시간"));
    if (pos === null)
      return interaction.reply({ content: "⚠️ 시간 형식이 올바르지 않아요. 예: `1:30`, `90`, `1:02:03`", ephemeral: true });
    if (pos >= track.info.duration)
      return interaction.reply({ content: `⚠️ 곡 길이(${msToTime(track.info.duration)})를 넘는 위치예요.`, ephemeral: true });

    await player.seek(pos);
    return interaction.reply(`⏩ **${msToTime(pos)}** 지점으로 이동했어요. (전체 ${msToTime(track.info.duration)})`);
  },
};
