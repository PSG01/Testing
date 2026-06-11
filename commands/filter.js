const { SlashCommandBuilder } = require("discord.js");
const { EQList } = require("lavalink-client");
const { checkVoice } = require("../utils");

const FILTERS = {
  off: { label: "끄기 (원음)", apply: async () => {} },
  bass: { label: "🔊 베이스부스트", apply: async (fm) => fm.setEQ(EQList.BassboostMedium) },
  nightcore: { label: "⏩ 나이트코어", apply: async (fm) => fm.toggleNightcore() },
  vaporwave: { label: "🌊 베이퍼웨이브", apply: async (fm) => fm.toggleVaporwave() },
  rotation: { label: "🎧 8D (회전)", apply: async (fm) => fm.toggleRotation(0.2) },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("필터")
    .setDescription("오디오 필터를 적용합니다 (베이스부스트/나이트코어/8D 등) 🎚️")
    .addStringOption((o) =>
      o
        .setName("종류")
        .setDescription("적용할 필터 (끄기 선택 시 원음으로)")
        .setRequired(true)
        .addChoices(...Object.entries(FILTERS).map(([value, f]) => ({ name: f.label.replace(/^[^ ]+ /, ""), value })))
    ),

  async execute(interaction, client) {
    const player = client.lavalink.getPlayer(interaction.guild.id);
    if (!player || !player.queue.current)
      return interaction.reply({ content: "⚠️ 재생 중이 아니에요.", flags: 64 });

    const voiceCheck = checkVoice(interaction, player);
    if (voiceCheck) return interaction.reply({ content: `⚠️ ${voiceCheck}`, flags: 64 });

    const key = interaction.options.getString("종류");
    const filter = FILTERS[key];
    await interaction.deferReply();
    try {
      // 중첩 방지: 먼저 모두 초기화 후 선택한 필터만 적용
      await player.filterManager.resetFilters();
      await player.filterManager.clearEQ();
      await filter.apply(player.filterManager);
      return interaction.editReply(key === "off" ? "🎚️ 필터를 모두 껐어요. (원음)" : `🎚️ **${filter.label}** 필터 적용! (해제: \`/필터 끄기\`)`);
    } catch (e) {
      console.error("필터 오류:", e?.message);
      return interaction.editReply("⚠️ 필터 적용에 실패했어요. Lavalink 버전을 확인해주세요.");
    }
  },
};
