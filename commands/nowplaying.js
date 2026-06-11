const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { msToTime } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("재생정보")
    .setDescription("지금 재생 중인 곡과 진행 상황을 보여줍니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중인 곡이 없어요.", ephemeral: true });

    const track = player.queue.current;
    const pos = player.position;
    const total = track.info.duration;

    // 간단한 진행 바
    let bar = "";
    if (!track.info.isStream && total > 0) {
      const filled = Math.round((pos / total) * 15);
      bar =
        "▬".repeat(Math.max(0, filled)) +
        "🔘" +
        "▬".repeat(Math.max(0, 15 - filled)) +
        `\n\`${msToTime(pos)} / ${msToTime(total)}\``;
    } else {
      bar = "🔴 라이브 스트림";
    }

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle("🎶 지금 재생 중")
      .setDescription(`**[${track.info.title}](${track.info.uri})**\n${bar}`)
      .addFields(
        { name: "아티스트", value: track.info.author || "알 수 없음", inline: true },
        { name: "볼륨", value: `${player.volume}%`, inline: true },
        { name: "반복", value: player.repeatMode || "off", inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
