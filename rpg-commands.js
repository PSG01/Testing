// ── 던전 RPG 명령/버튼 (1단계) ────────────────────────────────────
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, AttachmentBuilder, StringSelectMenuBuilder } = require("discord.js");
const rpg = require("./rpg");
const render = require("./rpg-render");
const economy = require("./economy");

const COIN = "🪙";
const battles = new Map(); // userId → battle state

const builders = [
  new SlashCommandBuilder().setName("직업선택").setDescription("던전 캐릭터를 만듭니다 (직업 6종 중 선택) 🛡️"),
  new SlashCommandBuilder().setName("던전").setDescription("던전에 입장해 턴제 전투를 시작합니다 ⚔️"),
  new SlashCommandBuilder().setName("내정보").setDescription("내 캐릭터 정보를 봅니다 📜"),
  new SlashCommandBuilder().setName("노가다").setDescription("30분마다 일해서 코인을 법니다 ⛏️"),
];
const commandsJSON = builders.map((b) => b.toJSON());
const commandNames = new Set(builders.map((b) => b.name));

function authorTag(user) {
  return { name: `${user.globalName || user.username} 님`, iconURL: user.displayAvatarURL ? user.displayAvatarURL() : undefined };
}
const fmtMin = (ms) => `${Math.ceil(ms / 60000)}분`;

// ── 전투 상태 생성 ────────────────────────────────────────────────
function newBattle(userId, ch, floor) {
  const s = rpg.statsOf(ch);
  const mob = rpg.monsterFor(floor);
  const b = {
    userId, floor, classKey: ch.classKey,
    pHp: s.maxHp, pMaxHp: s.maxHp, pMp: s.maxMp, pMaxMp: s.maxMp,
    mob, kills: 0, order: ["P", "E", "P", "E", "P"],
  };
  battles.set(userId, b);
  return b;
}
function carryBattle(b) {
  // 다음 층: HP/MP 일부 회복(30%/50%)
  b.floor++;
  b.pHp = Math.min(b.pMaxHp, b.pHp + Math.floor(b.pMaxHp * 0.3));
  b.pMp = Math.min(b.pMaxMp, b.pMp + Math.floor(b.pMaxMp * 0.5));
  b.mob = rpg.monsterFor(b.floor);
  return b;
}

function battleRow(userId, ch, b, disabled = false) {
  const s = rpg.statsOf(ch);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rpg_atk_${userId}`).setLabel("공격").setEmoji("⚔️").setStyle(ButtonStyle.Primary).setDisabled(disabled),
    new ButtonBuilder().setCustomId(`rpg_skill_${userId}`).setLabel(`${s.skill.name} (MP${s.skill.mp})`).setEmoji("✨").setStyle(ButtonStyle.Success).setDisabled(disabled || b.pMp < s.skill.mp),
    new ButtonBuilder().setCustomId(`rpg_potion_${userId}`).setLabel(`물약 (${ch.potions})`).setEmoji("🧪").setStyle(ButtonStyle.Secondary).setDisabled(disabled || ch.potions <= 0),
    new ButtonBuilder().setCustomId(`rpg_run_${userId}`).setLabel("도망").setEmoji("🏃").setStyle(ButtonStyle.Secondary).setDisabled(disabled)
  );
}
function nextRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rpg_next_${userId}`).setLabel("다음 층으로").setEmoji("⬇️").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`rpg_exit_${userId}`).setLabel("던전 나가기 (보상 확정)").setEmoji("🚪").setStyle(ButtonStyle.Secondary)
  );
}

function battleEmbed(user, b, imgName) {
  return new EmbedBuilder().setColor(0x5a4a8a).setAuthor(authorTag(user))
    .setTitle(`🏰 던전 B${b.floor}F — ${b.mob.name}`)
    .setImage(`attachment://${imgName}`)
    .setFooter({ text: "버튼으로 행동을 선택하세요" });
}

// ── 명령 처리 ─────────────────────────────────────────────────────
async function handleCommand(interaction) {
  const userId = interaction.user.id;
  switch (interaction.commandName) {
    case "직업선택": {
      if (rpg.getChar(userId))
        return interaction.reply({ content: "⚠️ 이미 캐릭터가 있어요! `/내정보`로 확인해 보세요.", ephemeral: true });
      const menu = new StringSelectMenuBuilder().setCustomId(`rpg_class_${userId}`).setPlaceholder("직업을 골라주세요");
      for (const [key, c] of Object.entries(rpg.CLASSES))
        menu.addOptions({ label: `${c.name}`, value: key, emoji: c.emoji, description: `HP${c.hp} ATK${c.atk} DEF${c.def} · ${c.skill.name}: ${c.skill.desc}` });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5a4a8a).setTitle("🛡️ 직업 선택")
          .setDescription("아래에서 직업을 골라 캐릭터를 만들어 보세요.\n던전(`/던전`)에서 몬스터를 잡으면 코인과 경험치를 얻습니다!")],
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }
    case "던전": {
      const ch = rpg.getChar(userId);
      if (!ch) return interaction.reply({ content: "⚠️ 먼저 `/직업선택`으로 캐릭터를 만들어 주세요!", ephemeral: true });
      if (battles.has(userId)) return interaction.reply({ content: "⚠️ 이미 전투 중이에요! 진행 중인 전투를 끝내 주세요.", ephemeral: true });
      await interaction.deferReply();
      const b = newBattle(userId, ch, 1);
      const png = await render.scenePng(b, `${b.mob.name}이(가) 나타났다!`);
      return interaction.editReply({
        embeds: [battleEmbed(interaction.user, b, "battle.png")],
        files: [new AttachmentBuilder(png, { name: "battle.png" })],
        components: [battleRow(userId, ch, b)],
      });
    }
    case "내정보": {
      const ch = rpg.getChar(userId);
      if (!ch) return interaction.reply({ content: "⚠️ 캐릭터가 없어요. `/직업선택`으로 만들어 보세요!", ephemeral: true });
      const s = rpg.statsOf(ch);
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5a4a8a).setAuthor(authorTag(interaction.user))
          .setTitle(`${s.emoji} ${s.className} Lv.${ch.level}`)
          .addFields(
            { name: "스탯", value: `HP ${s.maxHp} · MP ${s.maxMp} · ATK ${s.atk} · DEF ${Math.floor(s.def)} · 크리 ${Math.round(s.crit * 100)}%`, inline: false },
            { name: "경험치", value: `${ch.exp} / ${rpg.expNeed(ch.level)}`, inline: true },
            { name: "물약", value: `🧪 ${ch.potions}개`, inline: true },
            { name: "기록", value: `최고 B${ch.bestFloor}F · 처치 ${ch.kills}마리 · 탐험 ${ch.runs}회`, inline: false }
          )],
      });
    }
  }
}

// 노가다 응답을 위처럼 꼬지 않게 별도 처리
async function handleGrind(interaction) {
  const userId = interaction.user.id;
  const r = rpg.grind(userId);
  if (!r.ok) {
    if (r.reason === "no_char") return interaction.reply({ content: "⚠️ 먼저 `/직업선택`으로 캐릭터를 만들어 주세요!", ephemeral: true });
    return interaction.reply({ content: `⏱️ 아직 쉬는 중이에요. ${fmtMin(r.remaining)} 뒤에 다시 일할 수 있어요.`, ephemeral: true });
  }
  economy.addBalance(userId, r.coins);
  const balance = economy.getUser(userId).balance;
  return interaction.reply({
    embeds: [new EmbedBuilder().setColor(0x8a6a4a).setAuthor(authorTag(interaction.user)).setTitle("⛏️ 노가다 완료!")
      .setDescription(`열심히 일해서 **+${r.coins}** ${COIN} 을 벌었어요.\n잔액: **${balance.toLocaleString()}** ${COIN}\n다음 일까지 30분 휴식!`)],
  });
}

// ── 버튼/선택 처리 ────────────────────────────────────────────────
async function handleButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith("rpg_")) return false;
  const parts = id.split("_");
  const action = parts[1];
  const ownerId = parts[2];

  // 직업 선택 메뉴
  if (action === "class" && interaction.isStringSelectMenu()) {
    if (interaction.user.id !== ownerId) return (await interaction.reply({ content: "⚠️ 본인 메뉴만 선택할 수 있어요.", ephemeral: true }), true);
    const key = interaction.values[0];
    const ch = rpg.createChar(ownerId, interaction.user.username, key);
    const c = rpg.CLASSES[key];
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x3a9d5c).setTitle(`${c.emoji} ${c.name} 탄생!`)
        .setDescription(`캐릭터를 만들었어요. \`/던전\` 으로 모험을 떠나 보세요!\n스킬: **${c.skill.name}** — ${c.skill.desc}`)],
      components: [],
    });
    return true;
  }

  if (interaction.user.id !== ownerId)
    return (await interaction.reply({ content: "⚠️ 본인 전투만 조작할 수 있어요.", ephemeral: true }), true);

  const ch = rpg.getChar(ownerId);
  const b = battles.get(ownerId);

  // 전투 종료 후 버튼
  if (action === "next" || action === "exit") {
    if (!b) return (await interaction.deferUpdate(), true);
    if (action === "exit") {
      rpg.recordRun(ownerId, b.floor, b.kills);
      battles.delete(ownerId);
      await interaction.update({
        embeds: [new EmbedBuilder().setColor(0x3a9d5c).setAuthor(authorTag(interaction.user)).setTitle("🚪 던전 탈출!")
          .setDescription(`B${b.floor}F 까지 도달 · ${b.kills}마리 처치\n획득한 보상은 모두 챙겼습니다. 수고했어요!`)],
        components: [], files: [],
      });
      return true;
    }
    // 다음 층
    await interaction.deferUpdate();
    carryBattle(b);
    const png = await render.scenePng(b, `${b.mob.name}이(가) 나타났다!`);
    await interaction.editReply({
      embeds: [battleEmbed(interaction.user, b, "battle.png")],
      files: [new AttachmentBuilder(png, { name: "battle.png" })],
      components: [battleRow(ownerId, ch, b)],
    });
    return true;
  }

  if (!b) return (await interaction.reply({ content: "⚠️ 진행 중인 전투가 없어요. `/던전` 으로 입장해 주세요.", ephemeral: true }), true);

  await interaction.deferUpdate();
  const s = rpg.statsOf(ch);
  const events = [];
  let runAway = false;

  // 플레이어 행동
  if (action === "atk") {
    const r = rpg.attack(s.atk, b.mob.def, { crit: s.crit });
    b.mob.hp -= r.dmg;
    events.push({ actor: "P", kind: "attack", dmg: r.dmg, crit: r.crit, label: `${s.className}의 공격!` });
  } else if (action === "skill") {
    if (b.pMp < s.skill.mp) return true;
    b.pMp -= s.skill.mp;
    if (s.skill.heal) {
      const amt = Math.floor(b.pMaxHp * s.skill.heal);
      b.pHp = Math.min(b.pMaxHp, b.pHp + amt);
      events.push({ actor: "P", kind: "heal", dmg: amt, label: `✨ ${s.skill.name}!` });
    } else {
      const r = rpg.attack(s.atk, b.mob.def, { mult: s.skill.mult, pierce: s.skill.pierce, crit: s.crit, critBoost: s.skill.critBoost || 1 });
      b.mob.hp -= r.dmg;
      if (s.skill.recoil) b.pHp -= Math.floor(r.dmg * s.skill.recoil);
      events.push({ actor: "P", kind: "skill", dmg: r.dmg, crit: r.crit, label: `✨ ${s.skill.name}!`, color: ch.classKey === "mage" ? "#ff7a4a" : "#7af" });
    }
  } else if (action === "potion") {
    if (ch.potions <= 0) return true;
    rpg.addPotion(ownerId, -1);
    const amt = Math.floor(b.pMaxHp * 0.5);
    b.pHp = Math.min(b.pMaxHp, b.pHp + amt);
    events.push({ actor: "P", kind: "potion", dmg: amt, label: "🧪 물약을 마셨다!" });
  } else if (action === "run") {
    runAway = Math.random() < 0.7;
    if (runAway) {
      rpg.recordRun(ownerId, b.floor, b.kills);
      battles.delete(ownerId);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0x99a).setAuthor(authorTag(interaction.user)).setTitle("🏃 도망 성공!")
          .setDescription(`B${b.floor}F 에서 무사히 빠져나왔어요. (${b.kills}마리 처치)`)],
        components: [], files: [],
      });
      return true;
    }
    events.push({ actor: "P", kind: "attack", dmg: 0, label: "🏃 도망 실패...!" });
  }

  const mobDead = b.mob.hp <= 0;

  // 몬스터 반격 (살아있으면)
  if (!mobDead) {
    const r = rpg.attack(b.mob.atk, s.def, { crit: 0.05 });
    b.pHp -= r.dmg;
    events.push({ actor: "E", kind: "attack", dmg: r.dmg, crit: r.crit, label: `${b.mob.name}의 공격!` });
  }
  const playerDead = b.pHp <= 0;

  // 결과 화면 구성
  let resultMsg = "다음 행동을 선택하세요";
  let resultColor = "#ffe9a8";
  if (mobDead) { resultMsg = `${b.mob.name} 처치! 🎉`; resultColor = "#7df0a0"; }
  if (playerDead) { resultMsg = "쓰러졌다... 💀"; resultColor = "#ff8a98"; }

  const after = JSON.parse(JSON.stringify(b));
  const { gif, finalPng, durationMs } = await render.actionGif(b, events, after, resultMsg, resultColor);

  let components, extraEmbed = null;
  if (playerDead) {
    rpg.recordRun(ownerId, b.floor, b.kills);
    battles.delete(ownerId);
    components = [];
    extraEmbed = new EmbedBuilder().setColor(0xe74c3c).setTitle("💀 패배...")
      .setDescription(`B${b.floor}F 에서 쓰러졌습니다. 지금까지 얻은 보상은 유지됩니다.\n\`/던전\` 으로 다시 도전해 보세요!`);
  } else if (mobDead) {
    b.kills++;
    const rw = rpg.rewardFor(b.floor, b.mob.isBoss);
    economy.addBalance(ownerId, rw.coins);
    if (rw.potion) rpg.addPotion(ownerId, rw.potion);
    const ups = rpg.gainExp(ownerId, rw.exp);
    components = [nextRow(ownerId)];
    extraEmbed = new EmbedBuilder().setColor(0x3a9d5c).setTitle(`🎉 B${b.floor}F 클리어!`)
      .setDescription(`+${rw.coins} ${COIN} · +${rw.exp} EXP${rw.potion ? " · 🧪 물약 획득!" : ""}${ups ? `\n⬆️ **레벨 업! Lv.${rpg.getChar(ownerId).level}**` : ""}`);
    if (ups) { // 레벨업 시 현재 전투 스탯 갱신 + 회복
      const ns = rpg.statsOf(rpg.getChar(ownerId));
      b.pMaxHp = ns.maxHp; b.pMaxMp = ns.maxMp; b.pHp = ns.maxHp; b.pMp = ns.maxMp;
    }
  } else {
    components = [battleRow(ownerId, rpg.getChar(ownerId), b)];
  }

  const embeds = [battleEmbed(interaction.user, b, "battle.gif")];
  if (extraEmbed) embeds.push(extraEmbed);
  const msg = await interaction.editReply({ embeds, files: [new AttachmentBuilder(gif, { name: "battle.gif" })], components });

  // GIF 끝나면 정지 사진으로 교체
  setTimeout(async () => {
    try {
      const e2 = [battleEmbed(interaction.user, b, "battle.png")];
      if (extraEmbed) e2.push(extraEmbed);
      await msg.edit({ embeds: e2, files: [new AttachmentBuilder(finalPng, { name: "battle.png" })] });
    } catch {}
  }, durationMs + 800);
  return true;
}

module.exports = { commandsJSON, commandNames, handleCommand: routeCommand, handleButton };

async function routeCommand(interaction) {
  if (interaction.commandName === "노가다") return handleGrind(interaction);
  return handleCommand(interaction);
}
