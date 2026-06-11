const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("일시정지")
    .setDescription("재생을 일시정지합니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중인 곡이 없어요.", ephemeral: true });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, ephemeral: true });

    if (player.paused)
      return interaction.reply({ content: "⏸️ 이미 일시정지 상태예요.", ephemeral: true });

    await player.pause();
    return interaction.reply("⏸️ 일시정지했어요. `/다시재생` 으로 이어서 들을 수 있어요.");
  },
};
