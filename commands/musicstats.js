const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const stats = require("../music-stats");

const TTL_SEC = 30; // 표시 시간 — 지나면 자동 삭제 (음악 채널 청결 유지)

module.exports = {
  data: new SlashCommandBuilder()
    .setName("음악랭킹")
    .setDescription("이 서버의 최다 재생곡 TOP10 + 최다 신청자를 봅니다 (30초 후 자동 삭제) 📈"),

  async execute(interaction) {
    const { songs, users } = stats.top(interaction.guild.id, 10);
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    const songLines = songs.map((s, i) => `${medal(i)} **${s.title}** — ${s.count}회`).join("\n") || "*아직 재생 기록이 없어요*";
    const userLines = users.map((u, i) => `${medal(i)} **${u.name}** — ${u.count}곡`).join("\n") || "*아직 신청 기록이 없어요*";

    const buildEmbed = (sec) =>
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: `⏳ ${sec}초 후 자동 삭제` })
        .setTitle("📈 음악 랭킹")
        .addFields(
          { name: "🎵 최다 재생곡 TOP10", value: songLines.slice(0, 1024), inline: false },
          { name: "🙋 최다 신청자", value: userLines.slice(0, 1024), inline: false }
        );

    await interaction.reply({ embeds: [buildEmbed(TTL_SEC)] });
    const msg = await interaction.fetchReply().catch(() => null);
    if (!msg) return;

    // 5초마다 남은 시간 갱신 → 0이 되면 삭제
    let remain = TTL_SEC;
    const timer = setInterval(async () => {
      remain -= 5;
      if (remain <= 0) {
        clearInterval(timer);
        await msg.delete().catch(() => {});
        return;
      }
      await msg.edit({ embeds: [buildEmbed(remain)] }).catch(() => clearInterval(timer));
    }, 5000);
  },
};
