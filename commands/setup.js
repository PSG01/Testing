const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig, buildView } = require("../music-channel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("셋업")
    .setDescription("지금 이 채널을 음악 채널로 설정하고 고정 플레이어를 띄웁니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // 패널 전송/저장/핀 고정이 3초를 넘길 수 있으므로 응답부터 예약
    await interaction.deferReply({ flags: 64 });

    // 이 채널에 남아 있는 본인(봇) 메시지들(옛 패널/임시 플레이어/안내 등) 청소 후 새로 그림
    let cleaned = 0;
    try {
      const recent = await interaction.channel.messages.fetch({ limit: 100 });
      const mine = recent.filter((m) => m.author.id === interaction.client.user.id);
      if (mine.size) {
        const deleted = await interaction.channel.bulkDelete(mine, true).catch(() => null); // 14일 지난 메시지는 자동 제외
        cleaned = deleted?.size ?? 0;
      }
    } catch {}

    const panel = await interaction.channel.send(buildView(null));
    setConfig(interaction.guild.id, interaction.channel.id, panel.id);
    await panel.pin().catch(() => {}); // 채널 상단 고정 시도 (권한 없으면 무시)

    return interaction.editReply(
      `✅ <#${interaction.channel.id}> 을(를) 음악 채널로 설정했어요.` +
        (cleaned ? ` (기존 봇 메시지 ${cleaned}개 정리)` : "") +
        "\n이제 이 채널에 **노래 제목/링크를 입력**하면 바로 재생되고, 위 플레이어가 실시간으로 갱신돼요.\n" +
        "음악 명령(`/재생` 등)도 이 채널에서만 동작합니다."
    );
  },
};
