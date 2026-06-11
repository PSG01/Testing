const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { msToTime } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("재생목록")
    .setDescription("현재 재생 목록을 보여줍니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중인 곡이 없어요.", flags: 64 });

    const current = player.queue.current;
    const upcoming = player.queue.tracks.slice(0, 10);

    const lines = upcoming.map(
      (t, i) =>
        `\`${i + 1}.\` [${t.info.title}](${t.info.uri}) — \`${
          t.info.isStream ? "라이브" : msToTime(t.info.duration)
        }\``
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📋 재생 목록")
      .setDescription(
        `**지금 재생 중**\n[${current.info.title}](${current.info.uri})\n\n` +
          (lines.length ? `**다음 곡**\n${lines.join("\n")}` : "다음 곡이 없어요.")
      );

    if (player.queue.tracks.length > 10)
      embed.setFooter({ text: `외 ${player.queue.tracks.length - 10}곡 더 있음` });

    return interaction.reply({ embeds: [embed] });
  },
};
