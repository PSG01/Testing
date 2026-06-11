const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("다시재생")
    .setDescription("멈췄던 노래를 이어서 틉니다."),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player)
      return interaction.reply({ content: "⚠️ 플레이어가 없어요.", flags: 64 });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });

    if (!player.paused)
      return interaction.reply({ content: "▶️ 이미 재생 중이에요.", flags: 64 });

    await player.resume();
    return interaction.reply("▶️ 다시 재생합니다.");
  },
};
