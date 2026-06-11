const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const stats = require("../music-stats");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("음악랭킹")
    .setDescription("이 서버의 최다 재생곡 TOP10 + 최다 신청자를 봅니다 📈"),

  async execute(interaction) {
    const { songs, users } = stats.top(interaction.guild.id, 10);
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    const songLines = songs.map((s, i) => `${medal(i)} **${s.title}** — ${s.count}회`).join("\n") || "*아직 재생 기록이 없어요*";
    const userLines = users.map((u, i) => `${medal(i)} **${u.name}** — ${u.count}곡`).join("\n") || "*아직 신청 기록이 없어요*";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📈 음악 랭킹")
      .addFields(
        { name: "🎵 최다 재생곡 TOP10", value: songLines.slice(0, 1024), inline: false },
        { name: "🙋 최다 신청자", value: userLines.slice(0, 1024), inline: false }
      );
    return interaction.reply({ embeds: [embed] });
  },
};
