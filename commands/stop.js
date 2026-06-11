const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("정지")
    .setDescription("재생을 멈추고 재생 목록을 비운 뒤 음성 채널에서 나갑니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player)
      return interaction.reply({ content: "⚠️ 재생 중이 아니에요.", flags: 64 });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });

    await player.destroy();
    return interaction.reply("⏹️ 정지하고 음성 채널에서 나갔어요.");
  },
};
