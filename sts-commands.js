// ── 등반(슬더슬형) 명령/버튼 ──────────────────────────────────────
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const sts = require("./sts");
const render = require("./sts-render");
const economy = require("./economy");

const fs = require("node:fs");
const path = require("node:path");
const COIN = "🪙";
const RUNS_FILE = path.join(__dirname, "data", "sts-runs.json");
const runs = new Map(); // userId → run (파일로 영구 저장 — 봇 재시작에도 유지)
try {
  const saved = JSON.parse(fs.readFileSync(RUNS_FILE, "utf8"));
  for (const [id, run] of saved) { if (run.battle?.enemy) sts.rebindEnemy(run.battle.enemy); runs.set(id, run); }
} catch {}
function persist() {
  try {
    fs.mkdirSync(path.dirname(RUNS_FILE), { recursive: true });
    const out = [...runs.entries()].map(([id, run]) => {
      const r = JSON.parse(JSON.stringify(run)); // pattern 함수는 자동 탈락
      return [id, r];
    });
    fs.writeFileSync(RUNS_FILE, JSON.stringify(out));
  } catch (e) { console.error("등반 저장 실패:", e.message); }
}

const builders = [
  new SlashCommandBuilder().setName("등반").setDescription("덱을 키우며 10층 탑을 오르는 카드 전투! (슬레이 더 스파이어풍) 🗼"),
  new SlashCommandBuilder().setName("내덱").setDescription("진행 중인 등반의 덱을 봅니다 🃏"),
  new SlashCommandBuilder().setName("노가다").setDescription("30분마다 일해서 코인을 법니다 ⛏️"),
];
const commandsJSON = builders.map((b) => b.toJSON());
const commandNames = new Set(builders.map((b) => b.name));

const authorTag = (u) => ({ name: `${u.globalName || u.username} 님`, iconURL: u.displayAvatarURL ? u.displayAvatarURL() : undefined });

// ── 버튼 행 ───────────────────────────────────────────────────────
function cardRows(userId, b) {
  const row1 = new ActionRowBuilder();
  b.hand.slice(0, 5).forEach((key, i) => {
    const c = sts.getCard(key);
    row1.addComponents(new ButtonBuilder().setCustomId(`sts_play_${userId}_${i}`).setLabel(`${i + 1}`).setStyle(c.kind === "attack" ? ButtonStyle.Danger : ButtonStyle.Primary).setDisabled(b.energy < c.cost));
  });
  const row2 = new ActionRowBuilder();
  b.hand.slice(5, 8).forEach((key, i) => {
    const c = sts.getCard(key);
    row2.addComponents(new ButtonBuilder().setCustomId(`sts_play_${userId}_${i + 5}`).setLabel(`${i + 6}`).setStyle(c.kind === "attack" ? ButtonStyle.Danger : ButtonStyle.Primary).setDisabled(b.energy < c.cost));
  });
  row2.addComponents(new ButtonBuilder().setCustomId(`sts_end_${userId}`).setLabel("턴 종료").setEmoji("⏭️").setStyle(ButtonStyle.Success));
  return b.hand.length > 5 ? [row1, row2] : [row1, row2];
}

function battleEmbed(user, run, imgName, extra) {
  const e = new EmbedBuilder().setColor(0x5a4a8a).setAuthor(authorTag(user))
    .setTitle(`🗼 등반 ${run.floor + 1}/10층 — ${run.battle.enemy.name}`)
    .setImage(`attachment://${imgName}`)
    .setFooter({ text: "카드 번호 버튼으로 사용 · 적 머리 위 = 다음 행동(의도)" });
  if (extra) e.setDescription(extra);
  return e;
}

async function showBattle(interaction, run, msg, msgColor) {
  const png = await render.scenePng(run, msg, msgColor);
  await interaction.editReply({
    embeds: [battleEmbed(interaction.user, run, "battle.png")],
    files: [new AttachmentBuilder(png, { name: "battle.png" })],
    components: cardRows(interaction.user.id, run.battle),
  });
}

// ── 층 진입 ───────────────────────────────────────────────────────
async function enterFloor(interaction, run) {
  const type = run.map[run.floor];
  if (type === "rest") {
    const heal = Math.floor(run.maxHp * 0.3);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`sts_rest_heal_${run.userId}`).setLabel(`회복 (+${heal} HP)`).setEmoji("🔥").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`sts_rest_upgrade_${run.userId}`).setLabel("카드 강화").setEmoji("⚒️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`sts_rest_remove_${run.userId}`).setLabel("카드 제거").setEmoji("🗑️").setStyle(ButtonStyle.Secondary)
    );
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xff9d2e).setAuthor(authorTag(interaction.user))
        .setTitle(`🔥 ${run.floor + 1}/10층 — 모닥불`)
        .setDescription(`HP ${run.hp}/${run.maxHp}\n쉬며 회복하거나, 카드 한 장을 **강화(+)** 하거나, 덱에서 빼 압축하세요.`)],
      files: [], components: [row],
    });
  }
  // 전투/엘리트/보스
  const enemy = sts.enemyFor(type, run.floor + 1);
  sts.startBattle(run, enemy);
  await showBattle(interaction, run, `${enemy.name} 등장! 카드를 고르세요`, "#ffe9a8");
}

// ── 명령 ──────────────────────────────────────────────────────────
async function handleCommand(interaction) {
  const userId = interaction.user.id;
  switch (interaction.commandName) {
    case "등반": {
      if (runs.has(userId)) return interaction.reply({ content: "⚠️ 이미 등반 중이에요! 진행 중인 전투 메시지에서 이어가 주세요.", ephemeral: true });
      const row = new ActionRowBuilder();
      for (const [key, c] of Object.entries(sts.CHARS))
        row.addComponents(new ButtonBuilder().setCustomId(`sts_char_${userId}_${key}`).setLabel(c.name).setEmoji(c.emoji).setStyle(ButtonStyle.Primary));
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5a4a8a).setAuthor(authorTag(interaction.user)).setTitle("🗼 등반 — 캐릭터 선택")
          .setDescription(Object.values(sts.CHARS).map((c) =>
            `${c.emoji} **${c.name}** (HP ${c.hp})\n　${c.desc}\n　패시브: ${c.passive}`).join("\n\n"))],
        components: [row],
      });
    }
    case "내덱": {
      const run = runs.get(userId);
      if (!run) return interaction.reply({ content: "⚠️ 진행 중인 등반이 없어요. `/등반` 으로 시작해 보세요!", ephemeral: true });
      const counts = {};
      for (const k of run.deck) counts[k] = (counts[k] || 0) + 1;
      const list = Object.entries(counts).map(([k, n]) => `• **${sts.getCard(k).name}**${n > 1 ? ` ×${n}` : ""} — ${sts.getCard(k).desc}`).join("\n");
      const relics = (run.relics || []).map((k) => `${sts.RELICS[k].emoji} **${sts.RELICS[k].name}** — ${sts.RELICS[k].desc}`).join("\n") || "없음";
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5a4a8a).setTitle(`🃏 내 덱 (${run.deck.length}장)`)
        .setDescription(list).addFields({ name: "🏺 유물", value: relics })], ephemeral: true });
    }
    case "노가다": {
      const r = economy.grindWork(userId, interaction.user.username);
      if (!r.ok) return interaction.reply({ content: `⏱️ 아직 쉬는 중이에요. ${Math.ceil(r.remaining / 60000)}분 뒤에 다시 일할 수 있어요.`, ephemeral: true });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x8a6a4a).setAuthor(authorTag(interaction.user)).setTitle("⛏️ 노가다 완료!")
          .setDescription(`열심히 일해서 **+${r.coins}** ${COIN} 을 벌었어요.\n잔액: **${r.balance.toLocaleString()}** ${COIN} · 다음 일까지 30분!`)],
      });
    }
  }
}

// ── 전투 종료 처리 ────────────────────────────────────────────────
async function victory(interaction, run) {
  const enemy = run.battle.enemy;
  const { coins, picks, relic } = sts.battleReward(run, enemy);
  economy.addBalance(run.userId, coins);
  run.pendingPicks = picks;
  run.lastRelic = relic;
  run.inBattle = false; run.battle = null;
  persist();

  if (run.map[run.floor] === "boss") {
    runs.delete(run.userId);
    persist();
    const bonus = 300;
    economy.addBalance(run.userId, bonus);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xffd770).setAuthor(authorTag(interaction.user))
        .setTitle("👑 등반 완료! 보스 격파!!")
        .setDescription(`10층 탑을 정복했습니다!\n💰 보상 +${coins} ${COIN} · 👑 클리어 보너스 +${bonus} ${COIN}`)],
      files: [], components: [],
    });
  }

  const row = new ActionRowBuilder();
  picks.forEach((k, i) => row.addComponents(
    new ButtonBuilder().setCustomId(`sts_pick_${run.userId}_${i}`).setLabel(`${sts.getCard(k).name}(${sts.getCard(k).cost})`).setStyle(sts.getCard(k).kind === "attack" ? ButtonStyle.Danger : ButtonStyle.Primary)
  ));
  row.addComponents(new ButtonBuilder().setCustomId(`sts_pick_${run.userId}_skip`).setLabel("건너뛰기").setStyle(ButtonStyle.Secondary));
  return interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x3a9d5c).setAuthor(authorTag(interaction.user))
      .setTitle(`🎉 ${run.floor + 1}층 클리어! (+${coins} ${COIN})`)
      .setDescription((relic ? `🏺 유물 획득: **${sts.RELICS[relic].emoji} ${sts.RELICS[relic].name}** — ${sts.RELICS[relic].desc}\n\n` : "") +
        "덱에 넣을 카드를 한 장 고르세요:\n" + picks.map((k, i) => `**${i + 1}. ${sts.getCard(k).name}** (⚡${sts.getCard(k).cost}) — ${sts.getCard(k).desc}`).join("\n"))],
    files: [], components: [row],
  });
}

async function defeat(interaction, run) {
  runs.delete(run.userId);
  persist();
  return interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0xe74c3c).setAuthor(authorTag(interaction.user))
      .setTitle("💀 등반 실패...")
      .setDescription(`${run.floor + 1}층에서 쓰러졌습니다. 지금까지 모은 코인은 유지됩니다.\n\`/등반\` 으로 새 덱과 함께 재도전!`)],
    files: [], components: [],
  });
}

// ── 버튼 ──────────────────────────────────────────────────────────
async function handleButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith("sts_")) return false;
  const parts = id.split("_");
  const action = parts[1];
  // ID 규칙: sts_play_<owner>_<idx> · sts_end_<owner> · sts_pick_<owner>_<i|skip>
  //          sts_rest_<heal|remove>_<owner> · sts_rm_<owner>_<cardKey>
  let owner, arg;
  if (action === "rest") { arg = parts[2]; owner = parts[3]; }
  else { owner = parts[2]; arg = parts[3]; }

  if (interaction.user.id !== owner)
    return (await interaction.reply({ content: "⚠️ 본인 등반만 조작할 수 있어요.", ephemeral: true }), true);

  // 캐릭터 선택 → 런 시작
  if (action === "char") {
    if (runs.has(owner)) return (await interaction.deferUpdate(), true);
    await interaction.deferUpdate();
    const run = sts.newRun(owner, arg);
    runs.set(owner, run);
    return (await enterFloor(interaction, run), true);
  }

  const run = runs.get(owner);
  if (!run) return (await interaction.reply({ content: "⚠️ 진행 중인 등반이 없어요. `/등반` 으로 시작!", ephemeral: true }), true);

  // 카드 보상 선택
  if (action === "pick") {
    await interaction.deferUpdate();
    if (arg !== "skip") {
      const k = run.pendingPicks?.[parseInt(arg, 10)];
      if (k) run.deck.push(k);
    }
    run.pendingPicks = null;
    run.floor++;
    persist();
    return (await enterFloor(interaction, run), true);
  }

  // 모닥불
  if (action === "rest") {
    await interaction.deferUpdate();
    if (arg === "heal") {
      run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.3));
      run.floor++;
      persist();
      return (await enterFloor(interaction, run), true);
    }
    // 카드 제거: 가장 많은 기본카드(타격>수비) 1장 제거 메뉴 대신 간단 선택 UI
    const counts = {};
    run.deck.forEach((k, i) => { if (!(k in counts)) counts[k] = i; });
    const uniq = Object.keys(counts).slice(0, 4);
    const row = new ActionRowBuilder();
    uniq.forEach((k) => row.addComponents(new ButtonBuilder().setCustomId(`sts_rm_${owner}_${k}`).setLabel(`${sts.CARDS[k].name} 제거`).setStyle(ButtonStyle.Secondary)));
    return (await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xff9d2e).setTitle("🗑️ 카드 제거").setDescription("덱에서 뺄 카드를 고르세요 (1장):")],
      components: [row],
    }), true);
  }
  if (action === "rest" && arg === "upgrade") {
    await interaction.deferUpdate();
    const uniq = [...new Set(run.deck.filter((k) => !k.endsWith("+")))].slice(0, 5);
    if (!uniq.length) {
      run.floor++; persist();
      return (await enterFloor(interaction, run), true);
    }
    const row = new ActionRowBuilder();
    uniq.forEach((k) => row.addComponents(new ButtonBuilder().setCustomId(`sts_up_${owner}_${k}`).setLabel(`${sts.getCard(k).name} 강화`).setStyle(ButtonStyle.Primary)));
    return (await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xff9d2e).setTitle("⚒️ 카드 강화").setDescription("강화할 카드를 고르세요 (수치 상승, + 표시):\n" + uniq.map((k) => `**${sts.getCard(k).name}** → ${sts.getCard(k + "+").desc}`).join("\n"))],
      components: [row],
    }), true);
  }
  if (action === "up") {
    await interaction.deferUpdate();
    sts.upgradeCard(run, parts[3]);
    run.floor++; persist();
    return (await enterFloor(interaction, run), true);
  }
  if (action === "rm") {
    await interaction.deferUpdate();
    const k = parts[3];
    const i = run.deck.indexOf(k);
    if (i >= 0) run.deck.splice(i, 1);
    run.floor++;
    persist();
    return (await enterFloor(interaction, run), true);
  }

  if (!run.inBattle || !run.battle)
    return (await interaction.deferUpdate(), true);
  const b = run.battle;

  // 카드 사용 → 빠른 PNG 갱신
  if (action === "play") {
    await interaction.deferUpdate();
    const idx = parseInt(arg, 10);
    const before = JSON.parse(JSON.stringify(run));
    const ev = sts.playCard(run, idx);
    if (!ev) return true;
    persist();
    // 카드 효과를 before 상태에 미적용(연출에서 적용) — before는 카드 사용 전 손패/HP
    const { gif, finalPng, durationMs } = await render.cardPlayGif(before, ev, run, b.enemy.hp <= 0 ? "쓰러뜨렸다!" : "카드를 고르세요");
    if (b.enemy.hp <= 0) {
      await interaction.editReply({ embeds: [battleEmbed(interaction.user, run, "battle.gif")], files: [new AttachmentBuilder(gif, { name: "battle.gif" })], components: [] });
      setTimeout(() => victory(interaction, run).catch(() => {}), durationMs + 300);
      return true;
    }
    const msg = await interaction.editReply({
      embeds: [battleEmbed(interaction.user, run, "battle.gif")],
      files: [new AttachmentBuilder(gif, { name: "battle.gif" })],
      components: cardRows(owner, b),
    });
    setTimeout(async () => {
      try { await msg.edit({ embeds: [battleEmbed(interaction.user, run, "battle.png")], files: [new AttachmentBuilder(finalPng, { name: "battle.png" })] }); } catch {}
    }, durationMs + 700);
    return true;
  }

  // 턴 종료 → 적 행동 GIF
  if (action === "end") {
    await interaction.deferUpdate();
    const before = JSON.parse(JSON.stringify(run));
    const r = sts.endTurn(run);
    persist();
    if (r.enemyDead) {
      const g = await render.enemyTurnGif(before, r.events, run, "승리!", "#7df0a0").catch(() => null);
      return (await victory(interaction, run), true);
    }
    const { gif, finalPng, durationMs } = await render.enemyTurnGif(before, r.events, run, r.playerDead ? "쓰러졌다..." : "내 턴! 카드를 고르세요", r.playerDead ? "#ff8a98" : "#7df0a0");
    if (r.playerDead) {
      await interaction.editReply({ embeds: [battleEmbed(interaction.user, run, "battle.gif")], files: [new AttachmentBuilder(gif, { name: "battle.gif" })], components: [] });
      setTimeout(() => defeat(interaction, run).catch(() => {}), durationMs + 400);
      return true;
    }
    const msg = await interaction.editReply({
      embeds: [battleEmbed(interaction.user, run, "battle.gif")],
      files: [new AttachmentBuilder(gif, { name: "battle.gif" })],
      components: cardRows(owner, b),
    });
    setTimeout(async () => {
      try { await msg.edit({ embeds: [battleEmbed(interaction.user, run, "battle.png")], files: [new AttachmentBuilder(finalPng, { name: "battle.png" })] }); } catch {}
    }, durationMs + 800);
    return true;
  }
  return true;
}

module.exports = { commandsJSON, commandNames, handleCommand, handleButton };
