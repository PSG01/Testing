const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("명령어")
    .setDescription("봇의 모든 명령어와 설명을 한눈에 봅니다 📖"),

  async execute(interaction, client) {
    const casino = require("../casino");
    const rpg = require("../sts-commands");

    const line = (c) => `\`/${c.name}\` — ${c.description}`;
    const music = [...client.commands.values()]
      .map((c) => c.data.toJSON())
      .filter((c) => c.name !== "명령어")
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .map(line)
      .join("\n");
    const games = casino.commandsJSON.map(line).join("\n");
    const dungeon = rpg.commandsJSON.map(line).join("\n");

    // 카테고리당 임베드 1개 — 필드 분할로 인한 잘림/어그러짐 없이 전체 폭으로 표시
    const embeds = [
      new EmbedBuilder().setColor(0x5865f2).setTitle("🎵 음악").setDescription(music.slice(0, 4096)),
      new EmbedBuilder().setColor(0xf1c40f).setTitle("🎰 게임 · 경제").setDescription(games.slice(0, 4096)),
      new EmbedBuilder()
        .setColor(0x9b59f0)
        .setTitle("🗼 던전 (등반)")
        .setDescription(dungeon.slice(0, 4096))
        .setFooter({ text: "게임은 재미용 가짜 코인입니다 (실제 돈·도박과 무관)" }),
    ];

    return interaction.reply({ embeds, ephemeral: true });
  },
};
