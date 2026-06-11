const { SlashCommandBuilder } = require("discord.js");
const { checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("반복")
    .setDescription("반복 모드를 설정합니다.")
    .addStringOption((o) =>
      o
        .setName("모드")
        .setDescription("반복 방식 선택")
        .setRequired(true)
        .addChoices(
          { name: "끄기", value: "off" },
          { name: "현재 곡 반복", value: "track" },
          { name: "재생 목록 전체 반복", value: "queue" }
        )
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player)
      return interaction.reply({ content: "⚠️ 재생 중이 아니에요.", flags: 64 });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });

    const mode = interaction.options.getString("모드");
    await player.setRepeatMode(mode); // "off" | "track" | "queue"

    const label = { off: "끄기", track: "현재 곡 반복", queue: "재생 목록 전체 반복" }[mode];
    return interaction.reply(`🔁 반복 모드: **${label}**`);
  },
};
