const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("스킵")
    .setDescription("현재 곡을 건너뜁니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중인 곡이 없어요.", ephemeral: true });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, ephemeral: true });

    const skipped = player.queue.current.info.title;
    if (player.queue.tracks.length > 0) {
      await player.skip();
      return interaction.reply(`⏭️ 건너뜀: **${skipped}**`);
    } else {
      await player.stopPlaying(true, false); // 큐 비우고 정지
      return interaction.reply(`⏭️ 마지막 곡 **${skipped}** 을(를) 건너뛰고 정지했어요.`);
    }
  },
};
