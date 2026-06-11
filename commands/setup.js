const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { setConfig, buildView } = require("../music-channel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("셋업")
    .setDescription("지금 이 채널을 음악 채널로 설정하고 고정 플레이어를 띄웁니다.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // 고정 패널 메시지 생성
    const panel = await interaction.channel.send(buildView(null));
    setConfig(interaction.guild.id, interaction.channel.id, panel.id);
    await panel.pin().catch(() => {}); // 채널 상단 고정 시도 (권한 없으면 무시)

    return interaction.reply({
      content:
        `✅ <#${interaction.channel.id}> 을(를) 음악 채널로 설정했어요.\n` +
        "이제 이 채널에 **노래 제목/링크를 입력**하면 바로 재생되고, 위 플레이어가 실시간으로 갱신돼요.\n" +
        "음악 명령(`/재생` 등)도 이 채널에서만 동작합니다.",
      ephemeral: true,
    });
  },
};
