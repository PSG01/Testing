const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { msToTime, checkVoice } = require("../utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("재생")
    .setDescription("노래를 틀거나 재생 목록에 담습니다.")
    .addStringOption((o) =>
      o
        .setName("검색어")
        .setDescription("노래 제목 또는 URL (YouTube/SoundCloud 등)")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const voiceCheck = checkVoice(interaction);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, ephemeral: true });

    const query = interaction.options.getString("검색어");
    await interaction.deferReply();

    // 플레이어 가져오거나 생성
    let player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player) {
      player = client.lavalink.createPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: interaction.member.voice.channel.id,
        textChannelId: interaction.channel.id,
        selfDeaf: true,
        volume: 80,
      });
    }
    if (!player.connected) await player.connect();

    // 검색
    const res = await player.search({ query }, interaction.user);
    if (!res || !res.tracks?.length) {
      return interaction.editReply("❌ 검색 결과를 찾지 못했어요.");
    }

    // 플레이리스트인지 단일 곡인지 구분
    if (res.loadType === "playlist") {
      await player.queue.add(res.tracks);
      await interaction.editReply(
        `📃 **${res.playlist?.name ?? "플레이리스트"}** — ${res.tracks.length}곡을 재생 목록에 담았어요`
      );
    } else {
      const track = res.tracks[0];
      await player.queue.add(track);
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("➕ 재생 목록에 담았어요")
        .setDescription(`**[${track.info.title}](${track.info.uri})**`)
        .addFields({
          name: "길이",
          value: track.info.isStream ? "🔴 라이브" : msToTime(track.info.duration),
          inline: true,
        });
      await interaction.editReply({ embeds: [embed] });
    }

    if (!player.playing && !player.paused) await player.play();
  },
};
