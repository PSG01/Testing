const { SlashCommandBuilder } = require("discord.js");
const autoplay = require("../autoplay");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("자동재생")
    .setDescription("큐가 비면 비슷한 곡을 자동으로 이어 트는 라디오 모드를 켜고 끕니다 📻"),

  async execute(interaction) {
    const on = autoplay.toggle(interaction.guild.id);
    return interaction.reply(
      on
        ? "📻 **자동재생 켜짐** — 재생 목록이 끝나면 마지막 곡과 비슷한 곡을 알아서 이어 틀어요."
        : "📴 **자동재생 꺼짐** — 재생 목록이 끝나면 멈춰요."
    );
  },
};
