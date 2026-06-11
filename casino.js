// ── 카지노(게임) 모듈 ─────────────────────────────────────────────
// 슬롯/연쇄/블랙잭/하이로우 + 코인 경제. 통합 봇의 index.js 가 불러 씁니다.
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");
const cascadeGif = require("./cascade-gif");
const bonusMode = require("./bonus-mode");
const roulette = require("./roulette");
const rouletteGif = require("./roulette-gif");
const slotGif = require("./slot-gif");
const cardRender = require("./card-render");
const diceGif = require("./dice-gif");
const grindGif = require("./grind-gif");
const raceGif = require("./race-gif");

// GIF 재생이 끝나면 마지막 장면 PNG로 교체(나중에 채팅을 다시 봐도 재생 안 되고 사진처럼 고정)
function freezeAfter(getMessage, durationMs, finalPng, pngName, rebuildEmbed) {
  setTimeout(async () => {
    try {
      const msg = await getMessage();
      const file = new AttachmentBuilder(finalPng, { name: pngName });
      await msg.edit({ embeds: [rebuildEmbed(pngName)], files: [file] });
    } catch (e) { /* 메시지 삭제/만료 시 무시 */ }
  }, durationMs + 800);
}
const economy = require("./economy");
const slot = require("./slot");
const cascade = require("./cascade");
const blackjack = require("./blackjack");
const highlow = require("./highlow");
const cards = require("./cards");

const MIN_BET = 10;
const MAX_BET = 10000;
const COIN = "🪙";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 동시 진행 방지 + 오류 시 환불 보장 ─────────────────────────────
// 연출(GIF) 중 버튼 연타로 게임이 겹치는 것을 막고,
// 정산 전에 오류가 나면 베팅을 자동 환불한다.
const inFlight = new Set();
async function guardedRun(interaction, bet, body) {
  const userId = interaction.user.id;
  if (inFlight.has(userId))
    return interaction.editReply({ content: "⚠️ 이전 게임이 끝나기를 기다려 주세요!", embeds: [], components: [], files: [] }).catch(() => {});
  inFlight.add(userId);
  let settled = false;
  try {
    await body(() => { settled = true; });
  } catch (e) {
    console.error("게임 처리 오류:", e?.message || e);
    if (!settled) {
      economy.addBalance(userId, bet);
      await interaction.editReply({ content: `⚠️ 오류가 발생해 베팅 ${bet.toLocaleString()} ${COIN} 을 환불했어요.`, embeds: [], components: [], files: [] }).catch(() => {});
    } else {
      await interaction.editReply({ content: "⚠️ 결과 표시 중 오류가 났지만 정산은 완료됐어요. `/잔액` 으로 확인하세요.", embeds: [], components: [], files: [] }).catch(() => {});
    }
  } finally {
    inFlight.delete(userId);
  }
}
const fmt = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}시간 ${m}분`;
};
// 플레이어 이름을 임베드 상단(아이콘 + 큰 글씨)에 표시
function authorTag(user) {
  return { name: `${user.globalName || user.username} 님`, iconURL: user.displayAvatarURL ? user.displayAvatarURL() : undefined };
}

const builders = [
  new SlashCommandBuilder()
    .setName("슬롯")
    .setDescription("슬롯머신을 돌립니다 (가짜 코인)")
    .addIntegerOption((o) =>
      o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("텀블")
    .setDescription("텀블 슬롯! 과일이 터진 자리에 새 과일이 떨어지며 연쇄 배수 상승 💥")
    .addIntegerOption((o) =>
      o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("블랙잭")
    .setDescription("딜러와 21 대결! 히트/스탠드로 승부 🃏")
    .addIntegerOption((o) =>
      o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("하이로우")
    .setDescription("다음 카드가 높을까 낮을까? 연승할수록 배수 상승 🎴")
    .addIntegerOption((o) =>
      o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("룰렛")
    .setDescription("룰렛을 돌립니다 (유러피언, 가짜 코인) 🎡")
    .addIntegerOption((o) =>
      o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("종류").setDescription("베팅 종류").setRequired(true).addChoices(
        { name: "🔴 빨강 (x2)", value: "red" },
        { name: "⚫ 검정 (x2)", value: "black" },
        { name: "홀수 (x2)", value: "odd" },
        { name: "짝수 (x2)", value: "even" },
        { name: "숫자 하나 (x36)", value: "number" }
      )
    )
    .addIntegerOption((o) =>
      o.setName("숫자").setDescription("종류가 '숫자'일 때 0~36 중 선택").setMinValue(0).setMaxValue(36)
    ),
  new SlashCommandBuilder()
    .setName("송금")
    .setDescription("다른 유저에게 코인을 보냅니다 💸")
    .addUserOption((o) => o.setName("받는사람").setDescription("코인을 받을 유저").setRequired(true))
    .addIntegerOption((o) => o.setName("금액").setDescription("보낼 코인").setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName("잭팟").setDescription("현재 잭팟 풀을 확인합니다 (슬롯 777 시 전액 지급) 💰"),
  new SlashCommandBuilder()
    .setName("주사위대결")
    .setDescription("다른 유저와 주사위(2d6) 코인 대결! 🎲")
    .addUserOption((o) => o.setName("상대").setDescription("대결할 유저").setRequired(true))
    .addIntegerOption((o) => o.setName("판돈").setDescription(`서로 거는 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)),
  new SlashCommandBuilder()
    .setName("크래시")
    .setDescription("배율이 오르는 동안 터지기 전에 캐시아웃! 🚀")
    .addIntegerOption((o) => o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)),
  new SlashCommandBuilder().setName("잔액").setDescription("내 코인 잔액과 기록을 봅니다"),
  new SlashCommandBuilder().setName("출석").setDescription("매일 무료 코인을 받습니다"),
  new SlashCommandBuilder().setName("노가다").setDescription("광산에서 광물을 캐서 코인을 법니다 (5분 쿨) ⛏️"),
  new SlashCommandBuilder().setName("퀘스트").setDescription("오늘의 일일 퀘스트 3개와 보상을 확인합니다 📜"),
  new SlashCommandBuilder()
    .setName("경마")
    .setDescription("우승마를 맞히면 x5.5! 25초간 모두 함께 베팅 🏇")
    .addIntegerOption((o) => o.setName("말").setDescription("베팅할 말 번호 (1~6)").setMinValue(1).setMaxValue(6).setRequired(true))
    .addIntegerOption((o) => o.setName("베팅").setDescription(`베팅할 코인 (${MIN_BET}~${MAX_BET})`).setMinValue(MIN_BET).setMaxValue(MAX_BET).setRequired(true)),
  new SlashCommandBuilder().setName("파산").setDescription("코인이 0일 때 구제 코인을 받습니다"),
  new SlashCommandBuilder().setName("랭킹").setDescription("코인 보유 랭킹을 봅니다"),
  new SlashCommandBuilder().setName("도움").setDescription("봇 사용법과 배당표를 봅니다"),
];
const commandsJSON = builders.map((c) => c.toJSON());
const commandNames = new Set(builders.map((c) => c.name));

// ── 임베드 ─────────────────────────────────────────────────────────
function spinEmbed(reels, bet) {
  return new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🎰 스핀 중...")
    .setDescription(slot.render(reels) + `\n베팅: **${bet}** ${COIN}`);
}

function resultEmbed(reels, bet, result, win, balance, user) {
  const net = win - bet;
  const color = win > bet ? 0x2ecc71 : win === bet ? 0x5865f2 : 0xe74c3c;
  let title = result.jackpot ? "🎉🎰 J A C K P O T 🎰🎉" : win >= bet * 5 ? "✨🎉 빅 윈! 🎉✨" : win > 0 ? "🎰 당첨!" : "🎰 슬롯 결과";
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(slot.render(reels) + `\n**${result.label}**`)
    .addFields(
      { name: "🎯 베팅", value: `${bet.toLocaleString()} ${COIN}`, inline: true },
      { name: "🎁 획득", value: `${win.toLocaleString()} ${COIN}`, inline: true },
      { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
      { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: false }
    )
    .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  if (user) e.setAuthor(authorTag(user));
  return e;
}

function betEmbed(bet, balance) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎰 슬롯")
    .setDescription(`다음 베팅: **${bet}** ${COIN}\n잔액: **${balance}** ${COIN}\n\n🎰 버튼으로 스핀하거나 ➖➕로 베팅을 조절하세요.`)
    .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
}

function buttons(bet) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`slot_again_${bet}`).setLabel(`다시 (${bet})`).setEmoji("🎰").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`slot_dec_${bet}`).setEmoji("➖").setStyle(ButtonStyle.Secondary).setDisabled(bet <= MIN_BET),
    new ButtonBuilder().setCustomId(`slot_inc_${bet}`).setEmoji("➕").setStyle(ButtonStyle.Secondary).setDisabled(bet >= MAX_BET)
  );
}

// ── 슬롯 실행 (애니메이션 + 정산) ──────────────────────────────────
async function runSpin(interaction, bet) {
  const userId = interaction.user.id;
  const user = interaction.user;
  const u = economy.getUser(userId, user.username);

  if (bet < MIN_BET || bet > MAX_BET)
    return interaction.editReply({ content: `⚠️ 베팅은 ${MIN_BET}~${MAX_BET} 사이여야 해요.`, embeds: [], components: [], files: [] });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` 또는 \`/파산\``, embeds: [], components: [], files: [] });

  return guardedRun(interaction, bet, async (markSettled) => {
  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const final = slot.spin();
  const result = slot.payout(final);
  const win = Math.floor(bet * result.mult);

  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x9b59f0).setAuthor(authorTag(user)).setTitle("🎰 굴리는 중...").setDescription("릴이 돌고 있습니다!")],
    components: [], files: [],
  });

  const { gif, finalPng, durationMs } = await slotGif.render(final, result, bet);
  let jackpotBonus = 0;
  if (result.jackpot) jackpotBonus = economy.claimJackpot(userId); // 777 → 잭팟 풀 전액!
  if (win > 0) economy.addBalance(userId, win);
  economy.recordSpin(userId, bet, win, "slot");
  markSettled();
  const balance = economy.getUser(userId).balance;
  const net = win - bet;

  const buildEmbed = (imgName) =>
    new EmbedBuilder()
      .setColor(win > bet ? 0x2ecc71 : win === bet ? 0x5865f2 : 0xe74c3c)
      .setAuthor(authorTag(user))
      .setTitle(result.jackpot ? "🎉🎰 J A C K P O T 🎰🎉" : win >= bet * 5 ? "✨🎉 빅 윈! 🎉✨" : win > 0 ? "🎰 당첨!" : "🎰 슬롯")
      .setDescription(`**${result.label}**` + (jackpotBonus > 0 ? `\n💰 잭팟 풀 **+${jackpotBonus.toLocaleString()}** ${COIN} 획득!!` : ""))
      .setImage(`attachment://${imgName}`)
      .addFields(
        { name: "🎯 베팅", value: `${bet.toLocaleString()} ${COIN}`, inline: true },
        { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
        { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
      )
      .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });

  await interaction.editReply({ embeds: [buildEmbed("slot.gif")], files: [new AttachmentBuilder(gif, { name: "slot.gif" })], components: [buttons(bet)] });
  freezeAfter(() => interaction.fetchReply(), durationMs, finalPng, "slot.png", buildEmbed);
  });
}

// ── 캐스케이드(연쇄) 슬롯 ──────────────────────────────────────────
function casButtons(bet) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cas_again_${bet}`).setLabel(`다시 (${bet})`).setEmoji("💥").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cas_dec_${bet}`).setEmoji("➖").setStyle(ButtonStyle.Secondary).setDisabled(bet <= MIN_BET),
    new ButtonBuilder().setCustomId(`cas_inc_${bet}`).setEmoji("➕").setStyle(ButtonStyle.Secondary).setDisabled(bet >= MAX_BET)
  );
}

function casEmbed(step, bet, runningWin, { final = false, balance = 0, user = null } = {}) {
  const titleMap = { spin: "🎰 스핀!", pop: "💥 터짐!", fall: "⬇️ 채우는 중..." };
  const color = final ? (runningWin > bet ? 0x2ecc71 : runningWin === bet ? 0x5865f2 : 0xe74c3c) : 0x9b59f0;
  const e = new EmbedBuilder().setColor(color);
  if (user) e.setAuthor(authorTag(user));

  let desc = cascade.render(step.grid, step.marked);
  if (step.chain >= 1 && step.phase === "pop") {
    const fire = "🔥".repeat(Math.min(step.chain, 5));
    desc += `\n${fire} **${step.chain}연쇄!**  배수 **×${step.mult}**  ·  +${step.stepWin} ${COIN}`;
  }
  desc += `\n\n💰 누적 획득: **${runningWin.toLocaleString()}** ${COIN}`;

  let title;
  if (final) {
    if (runningWin >= bet * 10) title = "🎉🎆 메가 윈!! 🎆🎉";
    else if (runningWin >= bet * 5) title = "✨🎉 빅 윈! 🎉✨";
    else if (runningWin > 0) title = "🍒 텀블 — 당첨!";
    else title = "🍒 텀블";
  } else title = titleMap[step.phase] || "🍒 텀블";
  e.setTitle(title).setDescription(desc);

  if (final) {
    const net = runningWin - bet;
    e.addFields(
      { name: "🎯 베팅", value: `${bet.toLocaleString()} ${COIN}`, inline: true },
      { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
      { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
    ).setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  }
  return e;
}

// 보너스(프리스핀) 화면
function bonusEmbed(spin, idx, bonusTotal, bet, { intro = false, final = false, balance = 0, user = null, scatters = 0, count = 5 } = {}) {
  const e = new EmbedBuilder().setColor(0xf1c40f);
  if (user) e.setAuthor(authorTag(user));
  if (intro) {
    return e
      .setTitle("🎆🎆🎆 B O N U S ! 🎆🎆🎆")
      .setDescription(`스캐터 ${cascade.SCATTER} **${scatters}개** 등장!\n\n**프리스핀 ${count}회** 획득! 배수가 점점 올라갑니다 🚀\n\`배수: ${cascade.FREE_MULTS.slice(0, count).join(" → ")}\``);
  }
  if (final) {
    return e
      .setTitle("🎆 보너스 종료 — 총 정산")
      .setDescription(`프리스핀 ${count}회 동안 획득한 보너스 상금!`)
      .addFields(
        { name: "🎁 보너스 합계", value: `+${bonusTotal.toLocaleString()} ${COIN}`, inline: true },
        { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
      )
      .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  }
  return e
    .setTitle(`🎆 프리스핀 ${idx}/${count}  ·  배수 ×${spin.mult}`)
    .setDescription(cascade.render(spin.grid) + `\n이번 스핀: +${spin.win.toLocaleString()} ${COIN}\n\n🎁 보너스 누적: **${bonusTotal.toLocaleString()}** ${COIN}`);
}

async function runCascade(interaction, bet) {
  const userId = interaction.user.id;
  const user = interaction.user;
  const u = economy.getUser(userId, user.username);
  if (bet < MIN_BET || bet > MAX_BET)
    return interaction.editReply({ content: `⚠️ 베팅은 ${MIN_BET}~${MAX_BET} 사이여야 해요.`, embeds: [], components: [], files: [] });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` 또는 \`/파산\``, embeds: [], components: [], files: [] });

  return guardedRun(interaction, bet, async (markSettled) => {
  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const play = cascade.play(bet);
  const { totalWin, scatters, freeSpins } = play;

  // "굴리는 중" 표시 (GIF 생성에 수 초 걸림)
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x9b59f0).setAuthor(authorTag(user)).setTitle("🎰 굴리는 중...").setDescription("과일이 쏟아집니다! 🍒🍇🍉")],
    components: [], files: [],
  });

  // 스핀 GIF 생성
  const { gif, finalPng, durationMs } = await cascadeGif.render(play, 1);

  if (totalWin > 0) economy.addBalance(userId, totalWin);
  markSettled(); // 본 스핀 정산 완료 (이후 오류여도 베팅 환불 없음)
  let grandWin = totalWin;
  const bal = economy.getUser(userId).balance;
  const net = totalWin - bet;
  const title = freeSpins > 0 ? "🎆 보너스 진입!" : totalWin >= bet * 5 ? "✨🎉 빅 윈! 🎉✨" : totalWin > 0 ? "🍒 텀블 — 당첨!" : "🍒 텀블";
  const buildCasEmbed = (imgName) =>
    new EmbedBuilder()
      .setColor(totalWin > bet ? 0x2ecc71 : totalWin === bet ? 0x5865f2 : 0xe74c3c)
      .setAuthor(authorTag(user))
      .setTitle(title)
      .setImage(`attachment://${imgName}`)
      .addFields(
        { name: "🎯 베팅", value: `${bet.toLocaleString()} ${COIN}`, inline: true },
        { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
        { name: "👛 잔액", value: `**${bal.toLocaleString()}** ${COIN}`, inline: true }
      )
      .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });

  await interaction.editReply({ embeds: [buildCasEmbed("spin.gif")], files: [new AttachmentBuilder(gif, { name: "spin.gif" })], components: freeSpins > 0 ? [] : [casButtons(bet)] });
  freezeAfter(() => interaction.fetchReply(), durationMs, finalPng, "spin.png", buildCasEmbed);

  // 🎆 보너스 (스캐터 3개+ → 5/7/10 프리스핀): 별도 GIF로 이어붙임
  if (freeSpins > 0) {
    const loading = await interaction.followUp({
      embeds: [new EmbedBuilder().setColor(0xf1c40f).setAuthor(authorTag(user)).setTitle("🎆 보너스 생성 중...").setDescription(`스캐터 ${scatters}개! 프리스핀 ${freeSpins}회 🔥`)],
    });
    const bonus = cascade.runFreeSpins(bet, freeSpins);
    const { gif: bgif, finalPng: bpng, durationMs: bdur } = await bonusMode.render(bonus, freeSpins);
    economy.addBalance(userId, bonus.total);
    grandWin += bonus.total;
    const bal2 = economy.getUser(userId).balance;
    const buildBonusEmbed = (imgName) =>
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setAuthor(authorTag(user))
        .setTitle("🎆 보너스 종료 — 총 정산")
        .setImage(`attachment://${imgName}`)
        .addFields(
          { name: "🎁 보너스 합계", value: `+${bonus.total.toLocaleString()} ${COIN}`, inline: true },
          { name: "👛 잔액", value: `**${bal2.toLocaleString()}** ${COIN}`, inline: true }
        )
        .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
    await loading.edit({ embeds: [buildBonusEmbed("bonus.gif")], files: [new AttachmentBuilder(bgif, { name: "bonus.gif" })], components: [casButtons(bet)] });
    freezeAfter(() => Promise.resolve(loading), bdur, bpng, "bonus.png", buildBonusEmbed);
  }

  economy.recordSpin(userId, bet, grandWin, "tumble");
  });
}

// ── 룰렛 ───────────────────────────────────────────────────────────
function rlButtons(bet, type, pick) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rl_again_${bet}_${type}_${pick ?? "x"}`).setLabel(`다시 (${bet})`).setEmoji("🎡").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rl_dec_${bet}_${type}_${pick ?? "x"}`).setEmoji("➖").setStyle(ButtonStyle.Secondary).setDisabled(bet <= MIN_BET),
    new ButtonBuilder().setCustomId(`rl_inc_${bet}_${type}_${pick ?? "x"}`).setEmoji("➕").setStyle(ButtonStyle.Secondary).setDisabled(bet >= MAX_BET)
  );
}

async function runRoulette(interaction, bet, type, pick) {
  const userId = interaction.user.id;
  const user = interaction.user;
  const u = economy.getUser(userId, user.username);
  if (bet < MIN_BET || bet > MAX_BET)
    return interaction.editReply({ content: `⚠️ 베팅은 ${MIN_BET}~${MAX_BET} 사이여야 해요.`, embeds: [], components: [], files: [] });
  if (type === "number" && (pick === null || pick === undefined))
    return interaction.editReply({ content: "⚠️ 종류를 '숫자'로 골랐으면 `숫자` 옵션(0~36)도 정해야 해요.", embeds: [], components: [], files: [] });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` 또는 \`/파산\``, embeds: [], components: [], files: [] });

  return guardedRun(interaction, bet, async (markSettled) => {
  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const result = roulette.spin();
  const mult = roulette.payout(type, result, pick);
  const win = bet * mult;

  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x9b59f0).setAuthor(authorTag(user)).setTitle("🎡 돌리는 중...").setDescription("공이 돌고 있습니다!")],
    components: [], files: [],
  });

  const betLabel = type === "number" ? `BET: #${pick}  ${bet}` : `BET: ${type.toUpperCase()}  ${bet}`;
  const { gif, finalPng, durationMs } = await rouletteGif.render(result, betLabel);

  if (win > 0) economy.addBalance(userId, win);
  economy.recordSpin(userId, bet, win, "roulette");
  markSettled();
  const bal = economy.getUser(userId).balance;
  const net = win - bet;
  const typeLabel = type === "number" ? `숫자 ${pick} (x36)` : roulette.TYPE_LABEL[type] + " (x2)";
  const buildRlEmbed = (imgName) =>
    new EmbedBuilder()
      .setColor(win > 0 ? 0x2ecc71 : 0xe74c3c)
      .setAuthor(authorTag(user))
      .setTitle(win >= bet * 10 ? "🎉🎡 빅 윈!! 🎡🎉" : win > 0 ? "🎡 룰렛 — 적중!" : "🎡 룰렛")
      .setImage(`attachment://${imgName}`)
      .addFields(
        { name: "🎯 베팅", value: `${typeLabel} · ${bet.toLocaleString()} ${COIN}`, inline: true },
        { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
        { name: "👛 잔액", value: `**${bal.toLocaleString()}** ${COIN}`, inline: true }
      )
      .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  await interaction.editReply({ embeds: [buildRlEmbed("roulette.gif")], files: [new AttachmentBuilder(gif, { name: "roulette.gif" })], components: [rlButtons(bet, type, pick)] });
  freezeAfter(() => interaction.fetchReply(), durationMs, finalPng, "roulette.png", buildRlEmbed);
  });
}

async function onRlButton(interaction) {
  const parts = interaction.customId.split("_"); // rl_again_100_red_x
  const action = parts[1];
  let bet = parseInt(parts[2], 10) || MIN_BET;
  const type = parts[3];
  const pick = parts[4] === "x" ? null : parseInt(parts[4], 10);
  if (action === "again") {
    await interaction.deferUpdate();
    return runRoulette(interaction, bet, type, pick);
  }
  if (action === "dec") bet = Math.max(MIN_BET, Math.floor(bet / 2));
  if (action === "inc") bet = Math.min(MAX_BET, bet * 2);
  const balance = economy.getUser(interaction.user.id, interaction.user.username).balance;
  const typeLabel = type === "number" ? `숫자 ${pick}` : roulette.TYPE_LABEL[type];
  const e = new EmbedBuilder()
    .setColor(0x9b59f0)
    .setTitle("🎡 룰렛")
    .setDescription(`다음 베팅: **${bet}** ${COIN} · ${typeLabel}\n잔액: **${balance.toLocaleString()}** ${COIN}\n\n🎡 버튼으로 돌리거나 ➖➕로 베팅을 조절하세요.`)
    .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  return interaction.update({ embeds: [e], components: [rlButtons(bet, type, pick)], files: [] });
}

// ── 주사위 대결 (유저 vs 유저) ─────────────────────────────────────
const pendingDuels = new Map(); // key: messageId 대신 `${challengerId}_${targetId}` 단순화

async function startDuel(interaction, target, pot) {
  const me = interaction.user;
  if (target.bot) return interaction.reply({ content: "⚠️ 봇과는 대결할 수 없어요.", ephemeral: true });
  if (target.id === me.id) return interaction.reply({ content: "⚠️ 자기 자신과는 대결할 수 없어요.", ephemeral: true });
  const u = economy.getUser(me.id, me.username);
  if (u.balance < pot) return interaction.reply({ content: `⚠️ 판돈이 부족해요. (잔액 ${u.balance} ${COIN})`, ephemeral: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`duel_acc_${me.id}_${target.id}_${pot}`).setLabel("수락").setEmoji("🎲").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`duel_dec_${me.id}_${target.id}_${pot}`).setLabel("거절").setStyle(ButtonStyle.Secondary)
  );
  return interaction.reply({
    content: `<@${target.id}>`,
    embeds: [new EmbedBuilder().setColor(0xcaa84a).setTitle("🎲 주사위 대결 신청!")
      .setDescription(`<@${me.id}> 님이 <@${target.id}> 님에게 **${pot.toLocaleString()}** ${COIN} 대결을 신청했습니다.\n주사위 2개 합이 높은 쪽이 판돈을 모두 가져갑니다. (무승부=환불)\n\n⏱️ 60초 안에 수락/거절을 눌러주세요.`)],
    components: [row],
  });
}

async function onDuelButton(interaction) {
  const [, action, challengerId, targetId, potStr] = interaction.customId.split("_");
  const pot = parseInt(potStr, 10);
  if (interaction.user.id !== targetId)
    return interaction.reply({ content: "⚠️ 대결 당사자만 누를 수 있어요.", ephemeral: true });

  if (action === "dec") {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(0x99a).setTitle("🎲 주사위 대결 — 거절됨").setDescription(`<@${targetId}> 님이 대결을 거절했습니다.`)],
      components: [], content: "",
    });
  }

  // 수락: 양쪽 잔액 확인 후 차감
  const a = economy.getUser(challengerId);
  const b = economy.getUser(targetId, interaction.user.username);
  if (a.balance < pot)
    return interaction.update({ content: "", embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("🎲 대결 무산").setDescription("신청자의 잔액이 부족해졌습니다.")], components: [] });
  if (b.balance < pot)
    return interaction.reply({ content: `⚠️ 판돈이 부족해요. (잔액 ${b.balance} ${COIN})`, ephemeral: true });

  economy.addBalance(challengerId, -pot);
  economy.addBalance(targetId, -pot);

  await interaction.update({ content: "", embeds: [new EmbedBuilder().setColor(0xcaa84a).setTitle("🎲 굴리는 중...")], components: [] });

  const dice = [1, 1, 1, 1].map(() => 1 + Math.floor(Math.random() * 6));
  const nameA = a.name || "신청자", nameB = b.name || "상대";
  let gif, finalPng, durationMs;
  try {
    ({ gif, finalPng, durationMs } = await diceGif.render(nameA, nameB, dice));
  } catch (e) {
    // 연출 실패 → 양쪽 판돈 환불
    console.error("주사위 GIF 오류:", e?.message || e);
    economy.addBalance(challengerId, pot);
    economy.addBalance(targetId, pot);
    return interaction.editReply({ content: "⚠️ 오류가 발생해 양쪽 판돈을 환불했어요.", embeds: [], components: [] }).catch(() => {});
  }
  const sumA = dice[0] + dice[1], sumB = dice[2] + dice[3];

  let resultLine;
  if (sumA === sumB) {
    economy.addBalance(challengerId, pot);
    economy.addBalance(targetId, pot);
    resultLine = `무승부! 판돈이 서로 환불되었습니다.`;
  } else {
    const winnerId = sumA > sumB ? challengerId : targetId;
    economy.addBalance(winnerId, pot * 2);
    economy.recordSpin(winnerId, pot, pot * 2, "dice");
    economy.recordSpin(sumA > sumB ? targetId : challengerId, pot, 0, "dice");
    resultLine = `<@${winnerId}> 님이 **${(pot * 2).toLocaleString()}** ${COIN} 을 가져갑니다!`;
  }

  const buildDuelEmbed = (imgName) =>
    new EmbedBuilder().setColor(0xffd770).setTitle(`🎲 주사위 대결 — ${sumA} : ${sumB}`)
      .setImage(`attachment://${imgName}`)
      .setDescription(`<@${challengerId}> vs <@${targetId}> · 판돈 ${pot.toLocaleString()} ${COIN}\n${resultLine}`)
      .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });

  const msg = await interaction.editReply({ embeds: [buildDuelEmbed("dice.gif")], files: [new AttachmentBuilder(gif, { name: "dice.gif" })] });
  freezeAfter(() => Promise.resolve(msg), durationMs, finalPng, "dice.png", buildDuelEmbed);
}

// ── 크래시 (버튼식 실시간 캐시아웃) ────────────────────────────────
const activeCrash = new Map(); // userId → { cashed, current }

function crashPoint() {
  // RTP ~96%: 4% 즉시 폭발, 그 외 0.96/U 분포 (최대 x500)
  const r = Math.random();
  if (r < 0.04) return 1.0;
  return Math.min(500, Math.floor((0.96 / (1 - r)) * 100) / 100);
}

function crashRow(userId, disabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`crash_out_${userId}`).setLabel("💰 캐시아웃").setStyle(ButtonStyle.Success).setDisabled(disabled)
  );
}

function crashEmbed(user, bet, mult, state) {
  const bar = "🟩".repeat(Math.min(12, Math.max(1, Math.round(Math.log2(mult) * 4 + 1))));
  const e = new EmbedBuilder().setAuthor(authorTag(user));
  if (state === "run") e.setColor(0x2ecc71).setTitle(`🚀 x${mult.toFixed(2)}`).setDescription(`${bar}\n베팅 ${bet.toLocaleString()} ${COIN} · 지금 캐시아웃하면 **${Math.floor(bet * mult).toLocaleString()}** ${COIN}`);
  if (state === "boom") e.setColor(0xe74c3c).setTitle(`💥 x${mult.toFixed(2)} 에서 폭발!`).setDescription(`베팅 ${bet.toLocaleString()} ${COIN} 을 잃었습니다...`);
  if (state === "cash") e.setColor(0xf1c40f).setTitle(`💰 x${mult.toFixed(2)} 캐시아웃 성공!`).setDescription(`**+${Math.floor(bet * mult).toLocaleString()}** ${COIN} 획득!`);
  return e.setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
}

async function runCrash(interaction, bet) {
  const userId = interaction.user.id;
  const user = interaction.user;
  const u = economy.getUser(userId, user.username);
  if (bet < MIN_BET || bet > MAX_BET)
    return interaction.editReply({ content: `⚠️ 베팅은 ${MIN_BET}~${MAX_BET} 사이여야 해요.` });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN})` });
  if (activeCrash.has(userId))
    return interaction.editReply({ content: "⚠️ 이미 진행 중인 크래시가 있어요!" });

  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const boomAt = crashPoint();
  const state = { cashed: false, current: 1.0 };
  activeCrash.set(userId, state);

  let mult = 1.0;
  await interaction.editReply({ embeds: [crashEmbed(user, bet, mult, "run")], components: [crashRow(userId, false)] });

  try {
    while (true) {
      await sleep(1100);
      if (state.cashed) {
        const win = Math.floor(bet * state.current);
        economy.addBalance(userId, win);
        economy.recordSpin(userId, bet, win, "crash");
        await interaction.editReply({ embeds: [crashEmbed(user, bet, state.current, "cash")], components: [crashRow(userId, true)] });
        return;
      }
      mult = Math.round(mult * 1.18 * 100) / 100;
      if (mult >= boomAt) {
        economy.recordSpin(userId, bet, 0, "crash");
        await interaction.editReply({ embeds: [crashEmbed(user, bet, boomAt, "boom")], components: [crashRow(userId, true)] });
        return;
      }
      state.current = mult;
      await interaction.editReply({ embeds: [crashEmbed(user, bet, mult, "run")], components: [crashRow(userId, false)] });
    }
  } finally {
    activeCrash.delete(userId);
  }
}

async function onCrashButton(interaction) {
  const userId = interaction.customId.split("_")[2];
  if (interaction.user.id !== userId)
    return interaction.reply({ content: "⚠️ 본인 게임만 캐시아웃할 수 있어요.", ephemeral: true });
  const state = activeCrash.get(userId);
  if (!state) return interaction.deferUpdate();
  state.cashed = true;
  return interaction.deferUpdate();
}

// ── 블랙잭 ─────────────────────────────────────────────────────────
const bjGames = new Map(); // userId -> { deck, player, dealer, bet }

async function bjView(game, { reveal = false, resultLabel = null, win = 0, balance = 0, user = null } = {}) {
  const pv = blackjack.handValue(game.player);
  const dealerShown = reveal ? blackjack.handValue(game.dealer) : "?";
  const color = resultLabel ? (win > game.bet ? 0x2ecc71 : win === game.bet ? 0x5865f2 : 0xe74c3c) : 0x2b6cb0;

  const png = await cardRender.blackjackPng(game, { reveal, dealerVal: dealerShown, playerVal: pv, resultText: resultLabel || null });
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(resultLabel ? `🃏 블랙잭 — ${resultLabel}` : "🃏 블랙잭")
    .setImage("attachment://bj.png");
  if (user) e.setAuthor(authorTag(user));
  if (resultLabel) {
    const net = win - game.bet;
    e.addFields(
      { name: "🎯 베팅", value: `${game.bet.toLocaleString()} ${COIN}`, inline: true },
      { name: "📈 손익", value: `${net >= 0 ? "+" : ""}${net.toLocaleString()} ${COIN}`, inline: true },
      { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
    ).setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  } else {
    e.setFooter({ text: "히트=한 장 더 · 스탠드=멈추기" });
  }
  return { embeds: [e], files: [new AttachmentBuilder(png, { name: "bj.png" })] };
}

function bjButtons(bet, done) {
  if (done)
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_again_${bet}`).setLabel(`다시 (${bet})`).setEmoji("🃏").setStyle(ButtonStyle.Success)
    );
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("bj_hit").setLabel("히트").setEmoji("🎴").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("bj_stand").setLabel("스탠드").setEmoji("✋").setStyle(ButtonStyle.Secondary)
  );
}

async function bjFinish(interaction, game) {
  if (game.deck.length < 12) game.deck.push(...blackjack.start().deck); // 덱 고갈 방지
  blackjack.dealerPlay(game.deck, game.dealer);
  const res = blackjack.settle(game.player, game.dealer);
  const win = Math.floor(game.bet * res.mult);
  if (win > 0) economy.addBalance(interaction.user.id, win);
  economy.recordSpin(interaction.user.id, game.bet, win, "blackjack");
  const balance = economy.getUser(interaction.user.id).balance;
  bjGames.delete(interaction.user.id);
  return { ...(await bjView(game, { reveal: true, resultLabel: res.label, win, balance, user: interaction.user })), components: [bjButtons(game.bet, true)] };
}

async function runBlackjack(interaction, bet) {
  const userId = interaction.user.id;
  const u = economy.getUser(userId, interaction.user.username);
  if (bjGames.has(userId))
    return interaction.editReply({ content: "⚠️ 이미 진행 중인 블랙잭이 있어요! 히트/스탠드로 먼저 끝내주세요.", embeds: [], components: [] });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` 또는 \`/파산\``, embeds: [], components: [] });

  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const game = blackjack.start();
  game.bet = bet;
  bjGames.set(userId, game);

  // 딜링 연출
  await interaction.editReply({ ...(await bjView({ ...game, player: [game.player[0]], dealer: [game.dealer[0]] }, { user: interaction.user })), components: [] });
  await sleep(500);

  // 양쪽 블랙잭 즉시 판정
  if (blackjack.isBlackjack(game.player) || blackjack.isBlackjack(game.dealer)) {
    return interaction.editReply(await bjFinish(interaction, game));
  }
  return interaction.editReply({ ...(await bjView(game, { user: interaction.user })), components: [bjButtons(bet, false)] });
}

async function onBjButton(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];

  if (action === "again") {
    const bet = parseInt(parts[2], 10) || MIN_BET;
    const bal = economy.getUser(interaction.user.id).balance;
    if (bal < bet) return interaction.reply({ content: `⚠️ 코인 부족 (잔액 ${bal})`, ephemeral: true });
    await interaction.deferUpdate();
    return runBlackjack(interaction, bet);
  }

  const game = bjGames.get(interaction.user.id);
  if (!game) return interaction.reply({ content: "진행 중인 블랙잭 게임이 없어요. `/블랙잭` 으로 시작하세요.", ephemeral: true });

  if (action === "hit") {
    if (game.deck.length === 0) game.deck.push(...blackjack.start().deck); // 덱 고갈 방지
    game.player.push(game.deck.pop());
    if (blackjack.handValue(game.player) > 21) {
      await interaction.deferUpdate();
      return interaction.editReply(await bjFinish(interaction, game));
    }
    return interaction.update({ ...(await bjView(game, { user: interaction.user })), components: [bjButtons(game.bet, false)] });
  }
  if (action === "stand") {
    await interaction.deferUpdate();
    return interaction.editReply(await bjFinish(interaction, game));
  }
}

// ── 하이로우 ───────────────────────────────────────────────────────
const hlGames = new Map(); // userId -> { bet, current, mult }

async function hlView(game, { ended = false, label = null, win = 0, balance = 0, user = null, next = null } = {}) {
  const p = highlow.probs(game.current);
  const mh = highlow.stepMult(p.higher);
  const ml = highlow.stepMult(p.lower);
  const color = ended ? (win > 0 ? 0x2ecc71 : 0xe74c3c) : 0x9b59f0;
  const multText = ended ? "" : `배수 x${game.mult.toFixed(2)} · 캐시아웃 ${Math.floor(game.bet * game.mult).toLocaleString()}`;
  const png = await cardRender.highlowPng(game, { next, label: ended ? (label || "").replace(/[`]/g, "") : null, multText });
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(ended ? `🎴 하이로우 — ${label}` : "🎴 하이로우")
    .setImage("attachment://hl.png");
  if (!ended) {
    e.setDescription(`연승 배수: **×${game.mult.toFixed(2)}** · 지금 캐시아웃: **${Math.floor(game.bet * game.mult).toLocaleString()}** ${COIN}\n다음 카드는? ⬆️ 높음${mh ? ` (×${mh})` : " (선택 못 함)"} · ⬇️ 낮음${ml ? ` (×${ml})` : " (선택 못 함)"}`);
  }
  if (user) e.setAuthor(authorTag(user));
  if (ended) {
    e.addFields(
      { name: "🎯 베팅", value: `${game.bet.toLocaleString()} ${COIN}`, inline: true },
      { name: "🎁 획득", value: `${win.toLocaleString()} ${COIN}`, inline: true },
      { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
    ).setFooter({ text: "동점은 무승부(계속 진행) · 재미용 가짜 코인입니다" });
  }
  return { embeds: [e], files: [new AttachmentBuilder(png, { name: "hl.png" })] };
}

function hlButtons(game, done) {
  if (done)
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`hl_again_${game.bet}`).setLabel(`다시 (${game.bet})`).setEmoji("🎴").setStyle(ButtonStyle.Success)
    );
  const p = highlow.probs(game.current);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("hl_higher").setLabel("높음").setEmoji("⬆️").setStyle(ButtonStyle.Primary).setDisabled(p.higher <= 0),
    new ButtonBuilder().setCustomId("hl_lower").setLabel("낮음").setEmoji("⬇️").setStyle(ButtonStyle.Primary).setDisabled(p.lower <= 0),
    new ButtonBuilder().setCustomId("hl_cash").setLabel("캐시아웃").setEmoji("💰").setStyle(ButtonStyle.Success).setDisabled(game.mult <= 1)
  );
}

async function runHighlow(interaction, bet) {
  const userId = interaction.user.id;
  const u = economy.getUser(userId, interaction.user.username);
  if (hlGames.has(userId))
    return interaction.editReply({ content: "⚠️ 이미 진행 중인 하이로우가 있어요! 캐시아웃하거나 끝내고 다시 시작하세요.", embeds: [], components: [] });
  if (u.balance < bet)
    return interaction.editReply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` 또는 \`/파산\``, embeds: [], components: [] });

  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const game = { bet, current: highlow.randomCard(), mult: 1 };
  hlGames.set(userId, game);
  return interaction.editReply({ ...(await hlView(game, { user: interaction.user })), components: [hlButtons(game, false)] });
}

async function onHlButton(interaction) {
  const parts = interaction.customId.split("_");
  const action = parts[1];

  if (action === "again") {
    const bet = parseInt(parts[2], 10) || MIN_BET;
    const bal = economy.getUser(interaction.user.id).balance;
    if (bal < bet) return interaction.reply({ content: `⚠️ 코인 부족 (잔액 ${bal})`, ephemeral: true });
    await interaction.deferUpdate();
    return runHighlow(interaction, bet);
  }

  const game = hlGames.get(interaction.user.id);
  if (!game) return interaction.reply({ content: "진행 중인 하이로우 게임이 없어요. `/하이로우` 로 시작하세요.", ephemeral: true });

  if (action === "cash") {
    const win = Math.floor(game.bet * game.mult);
    economy.addBalance(interaction.user.id, win);
    economy.recordSpin(interaction.user.id, game.bet, win, "highlow");
    const balance = economy.getUser(interaction.user.id).balance;
    hlGames.delete(interaction.user.id);
    return interaction.update({ ...(await hlView(game, { ended: true, label: "캐시아웃 💰", win, balance, user: interaction.user })), components: [hlButtons(game, true)] });
  }

  // 높음/낮음
  const guess = action === "higher" ? "higher" : "lower";
  const p = highlow.probs(game.current);
  const sideProb = guess === "higher" ? p.higher : p.lower;
  const next = highlow.randomCard();
  const verdict = highlow.judge(game.current, next, guess);

  if (verdict === "push") {
    // 동점 = 무승부: 배수 그대로, 새 카드로 계속
    game.current = next;
    return interaction.update({
      ...(await hlView(game, { user: interaction.user })),
      content: `🤝 동점! (${next.rank}${next.suit}) — 무승부라 그대로 계속합니다.`,
      components: [hlButtons(game, false)],
    });
  }
  const correct = verdict === "win";

  if (!correct) {
    economy.recordSpin(interaction.user.id, game.bet, 0, "highlow");
    const balance = economy.getUser(interaction.user.id).balance;
    const ended = { ...game, current: next };
    hlGames.delete(interaction.user.id);
    return interaction.update({
      ...(await hlView(game, { ended: true, label: `❌ 빗나감 (${next.rank}${next.suit})`, win: 0, balance, user: interaction.user, next })),
      components: [hlButtons(ended, true)],
    });
  }

  // 정답 → 배수 상승, 카드 갱신
  game.mult = Math.round(game.mult * highlow.stepMult(sideProb) * 100) / 100;
  game.current = next;
  return interaction.update({ ...(await hlView(game, { user: interaction.user })), components: [hlButtons(game, false)] });
}

// ── 인터랙션 ───────────────────────────────────────────────────────
async function onCommand(interaction) {
  const userId = interaction.user.id;
  const name = interaction.user.username;

  switch (interaction.commandName) {
    case "슬롯": {
      await interaction.deferReply();
      return runSpin(interaction, interaction.options.getInteger("베팅"));
    }
    case "텀블": {
      await interaction.deferReply();
      return runCascade(interaction, interaction.options.getInteger("베팅"));
    }
    case "블랙잭": {
      await interaction.deferReply();
      return runBlackjack(interaction, interaction.options.getInteger("베팅"));
    }
    case "하이로우": {
      await interaction.deferReply();
      return runHighlow(interaction, interaction.options.getInteger("베팅"));
    }
    case "룰렛": {
      await interaction.deferReply();
      return runRoulette(
        interaction,
        interaction.options.getInteger("베팅"),
        interaction.options.getString("종류"),
        interaction.options.getInteger("숫자")
      );
    }
    case "송금": {
      const to = interaction.options.getUser("받는사람");
      const amount = interaction.options.getInteger("금액");
      if (to.bot) return interaction.reply({ content: "⚠️ 봇에게는 송금할 수 없어요.", ephemeral: true });
      if (to.id === interaction.user.id) return interaction.reply({ content: "⚠️ 자기 자신에게는 송금할 수 없어요.", ephemeral: true });
      const r = economy.transfer(interaction.user.id, to.id, amount, to.username);
      if (!r.ok)
        return interaction.reply({ content: r.reason === "balance" ? `⚠️ 잔액이 부족해요. (잔액 ${r.balance} ${COIN})` : "⚠️ 1코인 이상 보내야 해요.", ephemeral: true });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x2ecc71).setAuthor(authorTag(interaction.user)).setTitle("💸 송금 완료")
          .setDescription(`<@${to.id}> 님에게 **${amount.toLocaleString()}** ${COIN} 을 보냈습니다.\n내 잔액: **${r.fromBalance.toLocaleString()}** ${COIN}`)],
      });
    }
    case "잭팟": {
      const amt = economy.jackpotAmount();
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle("💰 잭팟 풀")
          .setDescription(`현재 잭팟 풀: **${amt.toLocaleString()}** ${COIN}\n\n모든 베팅의 1%가 쌓이고, \`/슬롯\`에서 **7️⃣7️⃣7️⃣** 잭팟이 터지면 전액 지급됩니다!`)
          .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" })],
      });
    }
    case "주사위대결": {
      return startDuel(interaction, interaction.options.getUser("상대"), interaction.options.getInteger("판돈"));
    }
    case "크래시": {
      await interaction.deferReply();
      return runCrash(interaction, interaction.options.getInteger("베팅"));
    }
    case "잔액": {
      const u = economy.getUser(userId, name);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${name} 님의 지갑`)
        .addFields(
          { name: "잔액", value: `**${u.balance}** ${COIN}`, inline: true },
          { name: "총 스핀", value: `${u.spins}회`, inline: true },
          { name: "최고 획득", value: `${u.biggestWin} ${COIN}`, inline: true }
        )
        .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
      return interaction.reply({ embeds: [embed] });
    }
    case "출석": {
      const r = economy.claimDaily(userId, name);
      if (!r.ok)
        return interaction.reply({ content: `⏳ 다음 출석까지 **${fmt(r.remaining)}** 남았어요.`, ephemeral: true });
      return interaction.reply(`✅ 출석 완료! **+${r.amount}** ${COIN} (잔액 ${r.balance} ${COIN})`);
    }
    case "노가다": {
      const r = economy.grindReady(userId);
      if (!r.ok)
        return interaction.reply({ content: `⏳ 곡괭이 손질 중... **${fmt(r.remaining)}** 뒤에 다시 캘 수 있어요.`, ephemeral: true });
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x8a6444)
          .setAuthor(authorTag(interaction.user))
          .setTitle("⛏️ 광산 도착!")
          .setDescription("어느 광맥을 캘까요? 어디서 뭐가 나올지는 운!\n`잡초 < 돌 < 철 < 은 < 금 < 💎다이아`")],
        components: [mineButtons()],
      });
    }
    case "경마": {
      const horse = interaction.options.getInteger("말") - 1;
      const raceBet = interaction.options.getInteger("베팅");
      return runRaceJoin(interaction, horse, raceBet);
    }
    case "퀘스트": {
      return interaction.reply(questView(userId, interaction.user));
    }
    case "파산": {
      const r = economy.claimBailout(userId, name);
      if (!r.ok && r.reason === "still_have")
        return interaction.reply({ content: `아직 코인이 ${r.balance} ${COIN} 남아 있어요.`, ephemeral: true });
      if (!r.ok && r.reason === "cooldown")
        return interaction.reply({ content: `⏳ 다음 구제까지 **${fmt(r.remaining)}** 남았어요. 그동안 \`/출석\` 도 이용하세요.`, ephemeral: true });
      return interaction.reply(`🛟 구제 코인 **+${r.amount}** ${COIN} 지급! (잔액 ${r.balance} ${COIN})`);
    }
    case "랭킹": {
      const rows = economy.leaderboard(10);
      const wk = economy.weeklyBoard(10);
      const all = rows.map((r, i) => `${["🥇","🥈","🥉"][i] || `${i + 1}.`} **${r.name}** — ${r.balance.toLocaleString()} ${COIN}`).join("\n") || "아직 없음";
      const weekly = wk.rows.map((r, i) => `${["🥇","🥈","🥉"][i] || `${i + 1}.`} **${r.name}** — ${r.net >= 0 ? "+" : ""}${r.net.toLocaleString()} ${COIN}`).join("\n") || "이번 주 기록 없음";
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🏆 랭킹")
        .addFields(
          { name: "💰 보유 코인 (전체)", value: all, inline: false },
          { name: `📅 이번 주 순익 (${wk.key}) — 매주 리셋`, value: weekly, inline: false }
        )
        .setFooter({ text: "재미용 가짜 코인입니다" });
      return interaction.reply({ embeds: [embed] });
    }
    case "도움": {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎰 슬롯 봇 도움말")
        .setDescription(
          "`/슬롯 [베팅]` — 클래식 3릴 슬롯\n" +
            "`/텀블 [베팅]` — 과일이 터지고 떨어지는 텀블 슬롯 (연쇄 배수 ↑) 🍒\n" +
            "`/블랙잭 [베팅]` — 딜러와 21 대결 🃏\n" +
            "`/하이로우 [베팅]` — 다음 카드 높/낮 맞히기 🎴\n" +
            "`/룰렛 [베팅] [종류] (숫자)` — 유러피언 룰렛 🎡 (빨강/검정/홀짝 x2 · 숫자 x36)\n" +
            "`/크래시 [베팅]` — 터지기 전에 캐시아웃! 🚀\n" +
            "`/주사위대결 [상대] [판돈]` — 유저끼리 2d6 대결 🎲\n" +
            "`/송금 [받는사람] [금액]` · `/잭팟` — 잭팟 풀 확인 💰\n" +
            "`/잔액` · `/출석` · `/파산` · `/랭킹`"
        )
        .addFields(
          { name: "💰 슬롯 배당 (3개 일치)", value: slot.paytable() },
          { name: "🍒 텀블", value: cascade.paytable() }
        )
        .setFooter({ text: `시작 코인 ${economy.START_BALANCE} · 출석 ${economy.DAILY_AMOUNT} · 재미용 가짜 코인입니다` });
      return interaction.reply({ embeds: [embed] });
    }
  }
}

async function onButton(interaction) {
  const parts = interaction.customId.split("_"); // ["slot","again","100"]
  const action = parts[1];
  let bet = parseInt(parts[2], 10) || MIN_BET;
  const userId = interaction.user.id;
  const balance = economy.getUser(userId, interaction.user.username).balance;

  if (action === "again") {
    await interaction.deferUpdate();
    return runSpin(interaction, bet);
  }
  if (action === "dec") bet = Math.max(MIN_BET, Math.floor(bet / 2));
  if (action === "inc") bet = Math.min(MAX_BET, bet * 2);
  return interaction.update({ embeds: [betEmbed(bet, balance)], components: [buttons(bet)] });
}

async function onCasButton(interaction) {
  const parts = interaction.customId.split("_"); // ["cas","again","100"]
  const action = parts[1];
  let bet = parseInt(parts[2], 10) || MIN_BET;
  const balance = economy.getUser(interaction.user.id, interaction.user.username).balance;

  if (action === "again") {
    await interaction.deferUpdate();
    return runCascade(interaction, bet);
  }
  if (action === "dec") bet = Math.max(MIN_BET, Math.floor(bet / 2));
  if (action === "inc") bet = Math.min(MAX_BET, bet * 2);
  const e = new EmbedBuilder()
    .setColor(0x9b59f0)
    .setTitle("🍒 텀블")
    .setDescription(`다음 베팅: **${bet}** ${COIN}\n잔액: **${balance}** ${COIN}\n\n💥 버튼으로 스핀하거나 ➖➕로 베팅을 조절하세요.`)
    .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
  return interaction.update({ embeds: [e], components: [casButtons(bet)] });
}


// ── 노가다: 광산 캐기 미니게임 ─────────────────────────────────────
const ORES = [
  { label: "잡초...", color: "#7a9a4a", tier: 0, min: 8, max: 18, p: 0.25 },
  { label: "돌멩이", color: "#b0b0ba", tier: 1, min: 30, max: 50, p: 0.30 },
  { label: "철광석", color: "#aab8c8", tier: 2, min: 60, max: 90, p: 0.20 },
  { label: "은광석", color: "#dce4ee", tier: 3, min: 100, max: 150, p: 0.15 },
  { label: "금광석", color: "#ffd23a", tier: 4, min: 180, max: 280, p: 0.08 },
  { label: "💎 다이아몬드", color: "#36e6ff", tier: 5, min: 500, max: 800, p: 0.02 },
];
function rollOre() {
  let roll = Math.random();
  for (const o of ORES) { if (roll < o.p) return o; roll -= o.p; }
  return ORES[0];
}
function mineButtons(disabled = false) {
  const names = ["왼쪽 광맥", "가운데 광맥", "오른쪽 광맥"];
  return new ActionRowBuilder().addComponents(
    ...names.map((n, i) => new ButtonBuilder().setCustomId(`mine_dig_${i}`).setLabel(n).setEmoji("⛏️").setStyle(ButtonStyle.Secondary).setDisabled(disabled))
  );
}
async function onMineButton(interaction) {
  const r = economy.grindReady(interaction.user.id);
  if (!r.ok) return interaction.reply({ content: `⏳ 곡괭이 손질 중... **${fmt(r.remaining)}** 뒤에 다시 캘 수 있어요.`, ephemeral: true });
  await interaction.deferUpdate();
  const ore = rollOre();
  const coins = ore.min + Math.floor(Math.random() * (ore.max - ore.min + 1));
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor(0x8a6444).setAuthor(authorTag(interaction.user)).setTitle("⛏️ 캐는 중...").setDescription("깡! 깡! 깡!")],
    components: [],
  });
  const { gif, finalPng, durationMs } = await grindGif.render({ ...ore, coins });
  const balance = economy.grindCommit(interaction.user.id, interaction.user.username, coins);
  economy.questEvent(interaction.user.id, ["play_mine"]);
  const buildMineEmbed = (img) =>
    new EmbedBuilder()
      .setColor(ore.tier >= 4 ? 0xf1c40f : ore.tier >= 2 ? 0x2ecc71 : 0x95a5a6)
      .setAuthor(authorTag(interaction.user))
      .setTitle(ore.tier >= 5 ? "💎✨ 대박!! ✨💎" : ore.tier >= 4 ? "✨ 금이다! ✨" : "⛏️ 채굴 완료")
      .setImage(`attachment://${img}`)
      .addFields(
        { name: "발견", value: ore.label, inline: true },
        { name: "획득", value: `+${coins.toLocaleString()} ${COIN}`, inline: true },
        { name: "👛 잔액", value: `**${balance.toLocaleString()}** ${COIN}`, inline: true }
      )
      .setFooter({ text: "다음 채굴은 5분 뒤에! ⛏️" });
  await interaction.editReply({ embeds: [buildMineEmbed("mine.gif")], files: [new AttachmentBuilder(gif, { name: "mine.gif" })], components: [] });
  freezeAfter(() => interaction.fetchReply(), durationMs, finalPng, "mine.png", buildMineEmbed);
}

// ── 경마 (채널 단위 합동 베팅 → 25초 뒤 출발, 싱글도 가능) ─────────
const races = new Map(); // channelId → { bets: Map<userId,{horse,bet,name}>, msg, started }
const RACE_WAIT_MS = 25_000;
const RACE_MULT = 5.5;
const HORSE_NAMES = ["🔴 1번 적토마", "🟠 2번 불꽃", "🟡 3번 황금", "🟢 4번 초원", "🔵 5번 파도", "🟣 6번 보라"];

function raceEmbed(race, secsLeft) {
  const lines = [...race.bets.values()]
    .map((b) => `• **${b.name}** → ${HORSE_NAMES[b.horse]} · ${b.bet.toLocaleString()} ${COIN}`)
    .join("\n") || "*아직 베팅 없음*";
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🏇 경마 — 베팅 받는 중!")
    .setDescription(`\`/경마 말:<1~6> 베팅:<코인>\` 으로 누구나 참가!\n적중 시 **x${RACE_MULT}** 배당 · **${secsLeft}초** 뒤 출발 🔫\n\n${lines}`)
    .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
}

async function runRaceJoin(interaction, horse, bet) {
  const userId = interaction.user.id;
  const u = economy.getUser(userId, interaction.user.username);
  let race = races.get(interaction.channelId);
  if (race?.started) return interaction.reply({ content: "⚠️ 이미 출발한 경주예요! 다음 경주를 기다려주세요.", ephemeral: true });
  if (race?.bets.has(userId)) return interaction.reply({ content: "⚠️ 이미 이번 경주에 베팅했어요!", ephemeral: true });
  if (u.balance < bet)
    return interaction.reply({ content: `⚠️ 코인이 부족해요! (잔액 ${u.balance} ${COIN}) — \`/출석\` \`/노가다\``, ephemeral: true });

  economy.addBalance(userId, -bet);
  economy.feedJackpot(bet);
  const entry = { horse, bet, name: u.name || interaction.user.username };

  if (!race) {
    race = { bets: new Map([[userId, entry]]), msg: null, started: false };
    races.set(interaction.channelId, race);
    await interaction.reply({ embeds: [raceEmbed(race, RACE_WAIT_MS / 1000)] });
    race.msg = await interaction.fetchReply().catch(() => null);
    setTimeout(() => { if (!race.started) race.msg?.edit({ embeds: [raceEmbed(race, 10)] }).catch(() => {}); }, RACE_WAIT_MS - 10_000);
    setTimeout(() => startRace(interaction.channelId), RACE_WAIT_MS);
  } else {
    race.bets.set(userId, entry);
    race.msg?.edit({ embeds: [raceEmbed(race, "곧 출발,")] }).catch(() => {});
    await interaction.reply({ content: `✅ ${HORSE_NAMES[horse]} 에 **${bet.toLocaleString()}** ${COIN} 베팅 완료!`, ephemeral: true });
  }
}

async function startRace(channelId) {
  const race = races.get(channelId);
  if (!race || race.started) return;
  race.started = true;
  try {
    const winner = Math.floor(Math.random() * 6);
    await race.msg?.edit({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle("🏇 출발!").setDescription("경주마들이 트랙을 질주합니다... 🔫")] }).catch(() => {});
    const { gif, finalPng, durationMs } = await raceGif.render(winner);
    const lines = [];
    for (const [uid, b] of race.bets) {
      if (b.horse === winner) {
        const win = Math.floor(b.bet * RACE_MULT);
        economy.addBalance(uid, win);
        economy.recordSpin(uid, b.bet, win, "race");
        lines.push(`🏆 **${b.name}**  +${win.toLocaleString()} ${COIN}`);
      } else {
        economy.recordSpin(uid, b.bet, 0, "race");
        lines.push(`💸 ${b.name}  -${b.bet.toLocaleString()} ${COIN}`);
      }
    }
    const buildRaceEmbed = (img) =>
      new EmbedBuilder()
        .setColor(0xffd770)
        .setTitle(`🏇 ${HORSE_NAMES[winner]} 우승!`)
        .setImage(`attachment://${img}`)
        .setDescription(lines.join("\n") || "*베팅자 없음*")
        .setFooter({ text: "재미용 가짜 코인입니다 (실제 돈·도박과 무관)" });
    const msg = await race.msg.edit({ embeds: [buildRaceEmbed("race.gif")], files: [new AttachmentBuilder(gif, { name: "race.gif" })] });
    freezeAfter(() => Promise.resolve(msg), durationMs, finalPng, "race.png", buildRaceEmbed);
  } catch (e) {
    console.error("경마 오류:", e?.message || e);
    for (const [uid, b] of race.bets) economy.addBalance(uid, b.bet); // 전원 환불
    race.msg?.edit({ content: "⚠️ 오류로 경주가 취소되어 전원 환불되었습니다.", embeds: [], files: [] }).catch(() => {});
  } finally {
    races.delete(channelId);
  }
}

async function onRaceButton(interaction) {
  return interaction.reply({ content: "참가 방법: `/경마 말:<1~6> 베팅:<코인>`", ephemeral: true });
}

// ── 일일 퀘스트 ────────────────────────────────────────────────────
function questBar(q) {
  const filled = Math.round((q.progress / q.target) * 8);
  const bar = "▰".repeat(filled) + "▱".repeat(8 - filled);
  const status = q.claimed ? "✅ 수령 완료" : q.done ? "🎁 **보상 받기 가능!**" : `${q.progress}/${q.target}`;
  return `${q.claimed ? "✅" : q.done ? "🎁" : "▫️"} **${q.label}** — ${q.reward} ${COIN}\n\`${bar}\` ${status}`;
}
function questView(userId, user) {
  const board = economy.questBoard(userId);
  const claimable = board.some((q) => q.done && !q.claimed);
  const embed = new EmbedBuilder()
    .setColor(claimable ? 0x2ecc71 : 0x5865f2)
    .setAuthor(authorTag(user))
    .setTitle("📜 오늘의 퀘스트")
    .setDescription(board.map(questBar).join("\n\n"))
    .setFooter({ text: "매일 자정(KST)에 새 퀘스트 3개로 갱신 · 3개 모두 달성 시 +300 보너스!" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("quest_claim").setLabel("보상 받기").setEmoji("🎁").setStyle(ButtonStyle.Success).setDisabled(!claimable),
    new ButtonBuilder().setCustomId("quest_refresh").setEmoji("🔄").setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}
async function onQuestButton(interaction) {
  const action = interaction.customId.split("_")[1];
  if (action === "refresh") return interaction.update(questView(interaction.user.id, interaction.user));
  // claim — 누른 사람 본인의 퀘스트를 수령
  const r = economy.claimQuests(interaction.user.id, interaction.user.username);
  if (!r.ok) return interaction.reply({ content: "아직 받을 보상이 없어요! 퀘스트를 먼저 완료해주세요.", ephemeral: true });
  await interaction.update(questView(interaction.user.id, interaction.user));
  const lines = r.claimed.map((q) => `• ${q.label} +${q.reward} ${COIN}`).join("\n");
  return interaction.followUp({
    content: `🎁 퀘스트 보상 수령!\n${lines}` + (r.allBonus ? `\n🌟 **전부 달성 보너스 +${r.allBonus} ${COIN}**` : "") + `\n→ 총 **+${r.total.toLocaleString()}** ${COIN} (잔액 ${r.balance.toLocaleString()})`,
    ephemeral: true,
  });
}

// ── 외부 노출 ──────────────────────────────────────────────────────
async function handleCommand(interaction) {
  return onCommand(interaction);
}
// 게임 패널 버튼은 그 게임을 시작한 본인만 사용 가능 (남의 결과 화면을 덮어쓰는 버그 방지)
const OWNED_PREFIX = ["slot_", "cas_", "bj_", "hl_", "rl_", "crash_"];
function panelOwnerId(interaction) {
  return interaction.message?.interactionMetadata?.user?.id ?? interaction.message?.interaction?.user?.id ?? null;
}
async function handleButton(interaction) {
  const id = interaction.customId;
  if (OWNED_PREFIX.some((p) => id.startsWith(p))) {
    const owner = panelOwnerId(interaction);
    if (owner && owner !== interaction.user.id) {
      await interaction.reply({ content: `⚠️ 이 게임 패널은 <@${owner}> 님의 것이에요. 본인 명령(\`/슬롯\` 등)으로 시작해주세요!`, ephemeral: true });
      return true;
    }
  }
  if (id.startsWith("slot_")) return (await onButton(interaction), true);
  if (id.startsWith("cas_")) return (await onCasButton(interaction), true);
  if (id.startsWith("bj_")) return (await onBjButton(interaction), true);
  if (id.startsWith("hl_")) return (await onHlButton(interaction), true);
  if (id.startsWith("rl_")) return (await onRlButton(interaction), true);
  if (id.startsWith("duel_")) return (await onDuelButton(interaction), true);
  if (id.startsWith("crash_")) return (await onCrashButton(interaction), true);
  if (id.startsWith("race_")) return (await onRaceButton(interaction), true);
  if (id.startsWith("mine_")) return (await onMineButton(interaction), true);
  if (id.startsWith("quest_")) return (await onQuestButton(interaction), true);
  return false;
}

module.exports = { commandsJSON, commandNames, handleCommand, handleButton };
