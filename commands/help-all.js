const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// 임베드 필드 1024자 제한에 맞춰 줄 목록을 여러 필드로 쪼갠다
function fields(name, lines) {
  const out = [];
  let buf = [];
  let len = 0;
  for (const line of lines) {
    if (len + line.length + 1 > 1000) {
      out.push({ name: out.length ? `${name} (계속)` : name, value: buf.join("\n") });
      buf = [];
      len = 0;
    }
    buf.push(line);
    len += line.length + 1;
  }
  if (buf.length) out.push({ name: out.length ? `${name} (계속)` : name, value: buf.join("\n") });
  return out;
}

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
      .map(line);
    const games = casino.commandsJSON.map(line);
    const dungeon = rpg.commandsJSON.map(line);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📖 전체 명령어")
      .addFields(
        ...fields("🎵 음악", music),
        ...fields("🎰 게임 · 경제", games),
        ...fields("🗼 던전 (등반)", dungeon)
      )
      .setFooter({ text: "게임은 재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
