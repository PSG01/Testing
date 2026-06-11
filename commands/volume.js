const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("볼륨")
    .setDescription("재생 볼륨을 조절합니다. (0~150)")
    .addIntegerOption((o) =>
      o
        .setName("값")
        .setDescription("0 ~ 150 사이 숫자")
        .setMinValue(0)
        .setMaxValue(150)
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player)
      return interaction.reply({ content: "⚠️ 재생 중이 아니에요.", flags: 64 });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });

    const vol = interaction.options.getInteger("값");
    await player.setVolume(vol);
    return interaction.reply(`🔊 볼륨을 **${vol}%** 로 설정했어요.`);
  },
};
