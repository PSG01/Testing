import random
import discord
from discord.ext import commands
from discord import app_commands, Embed, Colour

class Gambling(commands.Cog):
    """
    • /코인토스, /주사위, /룰렛, /블랙잭 등을 포함한 베팅 게임
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # 블랙잭 진행 중인 세션 저장:
        # {guild_id: { "player_cards": [...], "dealer_cards": [...], "deck": [...], "bet": int, "playing": bool }}
        self.blackjack_sessions = {}

    # ─ 코인토스 ─
    @app_commands.command(
        name="코인토스",
        description="코인토스: 앞/뒤를 맞히면 베팅액×2, 틀리면 베팅액 손실"
    )
    @app_commands.describe(
        선택="‘앞’ 또는 ‘뒤’ 중 하나를 입력하세요.",
        베팅="베팅할 코인 수(정수)"
    )
    async def coinflip(self, interaction: discord.Interaction, 선택: str, 베팅: int):
        await interaction.response.defer(ephemeral=True)
        econ = self.bot.get_cog("Economy")
        bal = econ.get_balance(interaction.guild.id, interaction.user.id)

        if 베팅 <= 0:
            await interaction.followup.send("🚫 베팅액은 1 이상이어야 합니다.", ephemeral=True)
            return
        if 베팅 > bal:
            await interaction.followup.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", ephemeral=True)
            return

        s = 선택.strip()
        if s not in ("앞", "뒤"):
            await interaction.followup.send("🚫 선택은 ‘앞’ 또는 ‘뒤’만 가능합니다.", ephemeral=True)
            return

        econ.change_balance(interaction.guild.id, interaction.user.id, -베팅)
        결과 = random.choice(["앞", "뒤"])
        if 결과 == s:
            새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, 베팅 * 2)
            embed = Embed(
                title="코인 토스 🎉",
                description=(
                    f"🔄 결과: **{결과}**\n"
                    f"🔮 당신의 선택: **{s}**\n"
                    f"📣 **승리!** 베팅액×2 만큼 코인을 획득했습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                ),
                color=Colour.green()
            )
        else:
            새잔고 = econ.get_balance(interaction.guild.id, interaction.user.id)
            embed = Embed(
                title="코인 토스 😢",
                description=(
                    f"🔄 결과: **{결과}**\n"
                    f"🔮 당신의 선택: **{s}**\n"
                    f"📣 **패배…** 베팅액을 잃었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                ),
                color=Colour.red()
            )

        await interaction.followup.send(embed=embed, ephemeral=True)

    @commands.command(name="코인토스")
    async def coinflip_prefix(self, ctx: commands.Context, 선택: str = None, 베팅: str = None):
        econ = self.bot.get_cog("Economy")

        # 인자 유무 체크
        if 선택 is None or 베팅 is None:
            await ctx.send(
                "🚫 사용법: `!코인토스 <앞|뒤> <베팅액>`\n예시: `!코인토스 앞 100`",
                delete_after=10
            )
            return

        s = 선택.strip()
        # 베팅 정수 검증
        try:
            bet_int = int(베팅)
        except ValueError:
            await ctx.send("🚫 베팅액은 정수만 입력 가능합니다.", delete_after=10)
            return

        bal = econ.get_balance(ctx.guild.id, ctx.author.id)
        if bet_int <= 0:
            await ctx.send("🚫 베팅액은 1 이상이어야 합니다.", delete_after=10)
            return
        if bet_int > bal:
            await ctx.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", delete_after=10)
            return

        if s not in ("앞", "뒤"):
            await ctx.send("🚫 선택은 ‘앞’ 또는 ‘뒤’만 가능합니다.", delete_after=10)
            return

        econ.change_balance(ctx.guild.id, ctx.author.id, -bet_int)
        결과 = random.choice(["앞", "뒤"])
        if 결과 == s:
            새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, bet_int * 2)
            embed = Embed(
                title="코인 토스 🎉",
                description=(
                    f"🔄 결과: **{결과}**\n"
                    f"🔮 당신의 선택: **{s}**\n"
                    f"📣 **승리!** 베팅액×2 만큼 코인을 획득했습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                ),
                color=Colour.green()
            )
        else:
            새잔고 = econ.get_balance(ctx.guild.id, ctx.author.id)
            embed = Embed(
                title="코인 토스 😢",
                description=(
                    f"🔄 결과: **{결과}**\n"
                    f"🔮 당신의 선택: **{s}**\n"
                    f"📣 **패배…** 베팅액을 잃었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                ),
                color=Colour.red()
            )

        await ctx.send(embed=embed)

    # ─ 주사위 ─
    @app_commands.command(name="주사위", description="주사위를 던져 봇과 대결합니다. 베팅액×2 배당")
    @app_commands.describe(베팅="베팅할 코인 수(정수)")
    async def dice(self, interaction: discord.Interaction, 베팅: int):
        await interaction.response.defer(ephemeral=True)
        econ = self.bot.get_cog("Economy")
        bal = econ.get_balance(interaction.guild.id, interaction.user.id)

        if 베팅 <= 0:
            await interaction.followup.send("🚫 베팅액은 1 이상이어야 합니다.", ephemeral=True)
            return
        if 베팅 > bal:
            await interaction.followup.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", ephemeral=True)
            return

        econ.change_balance(interaction.guild.id, interaction.user.id, -베팅)
        유저굴림 = random.randint(1, 6)
        봇굴림 = random.randint(1, 6)

        if 유저굴림 > 봇굴림:
            새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, 베팅 * 2)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"📣 **승리!** 베팅액×2 코인 획득\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.green()
        elif 유저굴림 < 봇굴림:
            새잔고 = econ.get_balance(interaction.guild.id, interaction.user.id)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"📣 **패배…** 베팅액 손실\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.red()
        else:
            환급 = 베팅 // 2
            새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, 환급)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"🤝 **무승부** → 베팅액 절반 {환급}코인 환급\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.gold()

        embed = Embed(title="🎲 주사위 대결", description=설명, color=색상)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @commands.command(name="주사위")
    async def dice_prefix(self, ctx: commands.Context, 베팅: str = None):
        econ = self.bot.get_cog("Economy")

        # 인자 유무 체크
        if 베팅 is None:
            await ctx.send("🚫 사용법: `!주사위 <베팅액>`\n예시: `!주사위 100`", delete_after=10)
            return

        # 베팅 정수 검증
        try:
            bet_int = int(베팅)
        except ValueError:
            await ctx.send("🚫 베팅액은 정수만 입력 가능합니다.", delete_after=10)
            return

        bal = econ.get_balance(ctx.guild.id, ctx.author.id)
        if bet_int <= 0:
            await ctx.send("🚫 베팅액은 1 이상이어야 합니다.", delete_after=10)
            return
        if bet_int > bal:
            await ctx.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", delete_after=10)
            return

        econ.change_balance(ctx.guild.id, ctx.author.id, -bet_int)
        유저굴림 = random.randint(1, 6)
        봇굴림 = random.randint(1, 6)

        if 유저굴림 > 봇굴림:
            새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, bet_int * 2)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"📣 **승리!** 베팅액×2 코인 획득\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.green()
        elif 유저굴림 < 봇굴림:
            새잔고 = econ.get_balance(ctx.guild.id, ctx.author.id)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"📣 **패배…** 베팅액 손실\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.red()
        else:
            환급 = bet_int // 2
            새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, 환급)
            설명 = (
                f"🎲 당신: **{유저굴림}**, 봇: **{봇굴림}**\n"
                f"🤝 **무승부** → 베팅액 절반 {환급}코인 환급\n"
                f"💰 **현재 잔고:** {새잔고} 코인"
            )
            색상 = Colour.gold()

        embed = Embed(title="🎲 주사위 대결", description=설명, color=색상)
        await ctx.send(embed=embed)

    # ─ 룰렛 ─
    @app_commands.command(
        name="룰렛",
        description="룰렛 베팅: 숫자(0~36) 배당 35:1, 색(빨강/검정) 배당 1:1"
    )
    @app_commands.describe(
        베팅="베팅할 코인 수(정수)",
        선택="0~36 또는 ‘빨강’, ‘검정’"
    )
    async def roulette(self, interaction: discord.Interaction, 베팅: int, 선택: str):
        await interaction.response.defer(ephemeral=True)
        econ = self.bot.get_cog("Economy")
        bal = econ.get_balance(interaction.guild.id, interaction.user.id)

        if 베팅 <= 0:
            await interaction.followup.send("🚫 베팅액은 1 이상이어야 합니다.", ephemeral=True)
            return
        if 베팅 > bal:
            await interaction.followup.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", ephemeral=True)
            return

        choice_str = 선택.strip().lower()
        econ.change_balance(interaction.guild.id, interaction.user.id, -베팅)

        wheel_number = random.randint(0, 36)
        if wheel_number == 0:
            wheel_color = "초록"
        else:
            wheel_color = "빨강" if (wheel_number % 2 == 1) else "검정"

        # 숫자 베팅 처리
        if choice_str.isdigit():
            n = int(choice_str)
            if not (0 <= n <= 36):
                await interaction.followup.send("🚫 숫자 베팅은 0~36 사이여야 합니다.", ephemeral=True)
                return

            if n == wheel_number:
                payout = 베팅 * 35
                새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, payout + 베팅)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{n}**\n"
                    f"📣 **대박!** 배당 35:1 지급되었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.gold()
            else:
                새잔고 = econ.get_balance(interaction.guild.id, interaction.user.id)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{n}**\n"
                    f"📣 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.red()

        # 색 베팅 처리
        else:
            if choice_str not in ("빨강", "red", "검정", "black"):
                await interaction.followup.send("🚫 베팅 옵션: 0~36 숫자 또는 ‘빨강’, ‘검정’만 가능합니다.", ephemeral=True)
                return

            bet_color = "빨강" if choice_str in ("빨강", "red") else "검정"
            if wheel_number != 0 and bet_color == wheel_color:
                payout = 베팅
                새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, payout + 베팅)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{bet_color}**\n"
                    f"📣 **승리!** 배당 1:1 지급되었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.green()
            else:
                새잔고 = econ.get_balance(interaction.guild.id, interaction.user.id)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{bet_color}**\n"
                    f"📣 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.red()

        embed = Embed(title="🎰 룰렛 결과", description=결과설명, color=컬러)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @commands.command(name="룰렛")
    async def roulette_prefix(self, ctx: commands.Context, 베팅: str = None, 선택: str = None):
        econ = self.bot.get_cog("Economy")

        # 인자 유무 체크
        if 베팅 is None or 선택 is None:
            await ctx.send(
                "🚫 사용법: `!룰렛 <베팅액> <숫자(0~36)|빨강|검정>`\n예시: `!룰렛 100 17`, `!룰렛 50 빨강`",
                delete_after=10
            )
            return

        # 베팅 정수 검증
        try:
            bet_int = int(베팅)
        except ValueError:
            await ctx.send("🚫 베팅액은 정수만 입력 가능합니다.", delete_after=10)
            return

        bal = econ.get_balance(ctx.guild.id, ctx.author.id)
        if bet_int <= 0:
            await ctx.send("🚫 베팅액은 1 이상이어야 합니다.", delete_after=10)
            return
        if bet_int > bal:
            await ctx.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", delete_after=10)
            return

        choice_str = 선택.strip().lower()
        econ.change_balance(ctx.guild.id, ctx.author.id, -bet_int)

        wheel_number = random.randint(0, 36)
        if wheel_number == 0:
            wheel_color = "초록"
        else:
            wheel_color = "빨강" if (wheel_number % 2 == 1) else "검정"

        if choice_str.isdigit():
            n = int(choice_str)
            if not (0 <= n <= 36):
                await ctx.send("🚫 숫자 베팅은 0~36 사이여야 합니다.", delete_after=10)
                return

            if n == wheel_number:
                payout = bet_int * 35
                새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, payout + bet_int)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{n}**\n"
                    f"📣 **대박!** 배당 35:1 지급되었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.gold()
            else:
                새잔고 = econ.get_balance(ctx.guild.id, ctx.author.id)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{n}**\n"
                    f"📣 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.red()
        else:
            if choice_str not in ("빨강", "red", "검정", "black"):
                await ctx.send("🚫 베팅 옵션: 0~36 숫자 또는 ‘빨강’, ‘검정’만 가능합니다.", delete_after=10)
                return

            bet_color = "빨강" if choice_str in ("빨강", "red") else "검정"
            if wheel_number != 0 and bet_color == wheel_color:
                payout = bet_int
                새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, payout + bet_int)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{bet_color}**\n"
                    f"📣 **승리!** 배당 1:1 지급되었습니다.\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.green()
            else:
                새잔고 = econ.get_balance(ctx.guild.id, ctx.author.id)
                결과설명 = (
                    f"🎡 나온 숫자: **{wheel_number}** ({wheel_color})\n"
                    f"🔮 당신의 베팅: **{bet_color}**\n"
                    f"📣 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                컬러 = Colour.red()

        embed = Embed(title="🎰 룰렛 결과", description=결과설명, color=컬러)
        await ctx.send(embed=embed)

    # ─ 블랙잭 구현 ─
    @app_commands.command(
        name="블랙잭",
        description="블랙잭을 시작하거나 진행합니다. (start/hit/stand) 예: /블랙잭 start 100"
    )
    @app_commands.describe(
        mode="start|hit|stand",
        베팅="start 모드일 때 베팅할 코인 수"
    )
    async def blackjack(self, interaction: discord.Interaction, mode: str, 베팅: int = 0):
        """
        • mode == "start": 새 게임 시작 (베팅액 전달 필수)
        • mode == "hit": 카드 한 장 추가
        • mode == "stand": 스탠드하여 딜러 플레이
        """
        await interaction.response.defer(ephemeral=True)
        guild_id = interaction.guild.id
        econ = self.bot.get_cog("Economy")

        # --- start 모드: 새 게임 생성 ---
        if mode.lower() == "start":
            if 베팅 <= 0:
                await interaction.followup.send("🚫 베팅액은 1 이상이어야 합니다.", ephemeral=True)
                return
            bal = econ.get_balance(guild_id, interaction.user.id)
            if 베팅 > bal:
                await interaction.followup.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", ephemeral=True)
                return

            # 베팅 차감
            econ.change_balance(guild_id, interaction.user.id, -베팅)

            # 덱 생성 (단일 덱)
            deck = []
            for suit in ["♠", "♥", "♦", "♣"]:
                for rank in list(range(2, 11)) + ["J", "Q", "K", "A"]:
                    deck.append(str(rank) + suit)
            random.shuffle(deck)

            # 플레이어/딜러 초기 카드 두 장씩 분배
            player_cards = [deck.pop(), deck.pop()]
            dealer_cards = [deck.pop(), deck.pop()]

            # 세션 저장
            self.blackjack_sessions[guild_id] = {
                "player_cards": player_cards,
                "dealer_cards": dealer_cards,
                "deck": deck,
                "bet": 베팅,
                "playing": True
            }

            # 플레이어 카드 합 계산
            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                # A를 1로 조정
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(player_cards)

            # 응답: 시작 시 딜러 카드 한 장만 공개
            embed = Embed(title="🃏 블랙잭 시작", color=Colour.purple())
            embed.add_field(name="당신의 카드", value=" | ".join(player_cards) + f"  (합: {player_total})", inline=False)
            embed.add_field(name="딜러의 카드", value=f"{dealer_cards[0]} | ?  (합: ?)", inline=False)
            embed.set_footer(text=f"베팅액: {베팅}코인 • /블랙잭 hit 또는 /블랙잭 stand 로 진행")
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # --- hit 모드: 플레이어에게 카드 한 장 추가 ---
        session = self.blackjack_sessions.get(guild_id)
        if not session or not session["playing"]:
            await interaction.followup.send("🚫 진행 중인 블랙잭 게임이 없습니다. `/블랙잭 start <베팅>` 으로 시작하세요.", ephemeral=True)
            return

        if mode.lower() == "hit":
            deck = session["deck"]
            card = deck.pop()
            session["player_cards"].append(card)

            # 카드 합 계산 함수
            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(session["player_cards"])
            dealer_cards = session["dealer_cards"]

            # 버스트 체크
            if player_total > 21:
                session["playing"] = False
                # 플레이어 버스트 시 패배
                result_desc = (
                    f"😢 **버스트!** 합: {player_total}\n"
                    f"💰 **당신의 최종 잔고:** {econ.get_balance(guild_id, interaction.user.id)} 코인"
                )
                result_color = Colour.red()
                footer = "게임 종료"
            else:
                result_desc = (
                    f"🎴 당신에게 **{card}** 카드를 추가했습니다.\n"
                    f"현재 카드: {' | '.join(session['player_cards'])}  (합: {player_total})\n\n"
                    f"딜러 카드: {dealer_cards[0]} | ?  (합: ?)\n\n"
                    f"계속 하려면 `/블랙잭 hit`, 멈추려면 `/블랙잭 stand` 입력"
                )
                result_color = Colour.orange()
                footer = f"베팅액: {session['bet']} 코인"

            embed = Embed(title="🃏 블랙잭 히트", description=result_desc, color=result_color)
            embed.set_footer(text=footer)
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # --- stand 모드: 딜러 플레이 후 결과 결정 ---
        if mode.lower() == "stand":
            session["playing"] = False
            deck = session["deck"]
            player_cards = session["player_cards"]
            dealer_cards = session["dealer_cards"]
            bet = session["bet"]

            # 합 계산 함수
            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(player_cards)
            dealer_total = calc_total(dealer_cards)

            # 딜러: 합 < 17 이면 히트 반복
            while dealer_total < 17:
                card = deck.pop()
                dealer_cards.append(card)
                dealer_total = calc_total(dealer_cards)

            # 결과 판정
            if dealer_total > 21 or player_total > dealer_total:
                # 플레이어 승리
                payout = bet * 2
                new_bal = econ.change_balance(interaction.guild.id, interaction.user.id, payout)
                title = "🏆 블랙잭 승리!"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"📣 **축하합니다!** 베팅액×2 ({payout}코인) 지급\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.green()
            elif player_total == dealer_total:
                # 무승부 (push): 베팅 환급
                new_bal = econ.change_balance(interaction.guild.id, interaction.user.id, bet)
                title = "🤝 블랙잭 무승부"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"🟰 **무승부입니다.** 베팅액 환급\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.gold()
            else:
                # 딜러 승리
                new_bal = econ.get_balance(interaction.guild.id, interaction.user.id)
                title = "😢 블랙잭 패배"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"💔 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.red()

            embed = Embed(title=title, description=desc, color=color)
            embed.set_footer(text="블랙잭 게임 종료")
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # 그 외 잘못된 모드
        await interaction.followup.send(
            "🚫 올바른 모드를 입력하세요:\n• `start <베팅액>` 또는 `hit` 또는 `stand`",
            ephemeral=True
        )

    @commands.command(name="블랙잭", help="블랙잭을 진행합니다. 예: !블랙잭 start 100")
    async def blackjack_prefix(self, ctx: commands.Context, mode: str = None, 베팅: str = None):
        econ = self.bot.get_cog("Economy")
        guild_id = ctx.guild.id

        # 인자 유무 체크
        if mode is None:
            await ctx.send(
                "🚫 사용법: `!블랙잭 <start|hit|stand> [베팅액]`\n"
                "• 게임 시작: `!블랙잭 start <베팅액>`\n"
                "• 카드 추가: `!블랙잭 hit`\n"
                "• 스탠드: `!블랙잭 stand`",
                delete_after=10
            )
            return

        mode_lower = mode.lower()
        session = self.blackjack_sessions.get(guild_id)

        # start
        if mode_lower == "start":
            if 베팅 is None:
                await ctx.send("🚫 start 모드일 때는 `베팅액`을 반드시 입력해야 합니다.", delete_after=10)
                return
            try:
                bet_int = int(베팅)
            except ValueError:
                await ctx.send("🚫 베팅액은 정수만 입력 가능합니다.", delete_after=10)
                return

            if bet_int <= 0:
                await ctx.send("🚫 베팅액은 1 이상이어야 합니다.", delete_after=10)
                return
            bal = econ.get_balance(guild_id, ctx.author.id)
            if bet_int > bal:
                await ctx.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", delete_after=10)
                return

            econ.change_balance(guild_id, ctx.author.id, -bet_int)

            deck = []
            for suit in ["♠", "♥", "♦", "♣"]:
                for rank in list(range(2, 11)) + ["J", "Q", "K", "A"]:
                    deck.append(str(rank) + suit)
            random.shuffle(deck)

            player_cards = [deck.pop(), deck.pop()]
            dealer_cards = [deck.pop(), deck.pop()]

            self.blackjack_sessions[guild_id] = {
                "player_cards": player_cards,
                "dealer_cards": dealer_cards,
                "deck": deck,
                "bet": bet_int,
                "playing": True
            }

            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(player_cards)

            embed = Embed(title="🃏 블랙잭 시작", color=Colour.purple())
            embed.add_field(name="당신의 카드", value=" | ".join(player_cards) + f"  (합: {player_total})", inline=False)
            embed.add_field(name="딜러의 카드", value=f"{dealer_cards[0]} | ?  (합: ?)", inline=False)
            embed.set_footer(text=f"베팅액: {bet_int}코인 • !블랙잭 hit 또는 !블랙잭 stand 로 진행")
            await ctx.send(embed=embed)
            return

        # hit
        if mode_lower == "hit":
            if not session or not session["playing"]:
                await ctx.send("🚫 진행 중인 블랙잭 게임이 없습니다. `!블랙잭 start <베팅액>` 으로 시작하세요.", delete_after=10)
                return

            deck = session["deck"]
            card = deck.pop()
            session["player_cards"].append(card)

            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(session["player_cards"])
            dealer_cards = session["dealer_cards"]

            if player_total > 21:
                session["playing"] = False
                새잔고 = econ.get_balance(guild_id, ctx.author.id)
                title = "😢 블랙잭 버스트!"
                desc = (
                    f"합계: {player_total} (버스트)\n"
                    f"💰 **현재 잔고:** {새잔고} 코인"
                )
                color = Colour.red()
                footer = "게임 종료"
            else:
                title = "🃏 블랙잭 히트"
                desc = (
                    f"당신에게 **{card}** 카드를 추가했습니다.\n"
                    f"현재 카드: {' | '.join(session['player_cards'])}  (합: {player_total})\n\n"
                    f"딜러 카드: {dealer_cards[0]} | ?  (합: ?)\n\n"
                    f"계속 하려면 `!블랙잭 hit`, 멈추려면 `!블랙잭 stand`"
                )
                color = Colour.orange()
                footer = f"베팅액: {session['bet']} 코인"

            embed = Embed(title=title, description=desc, color=color)
            embed.set_footer(text=footer)
            await ctx.send(embed=embed)
            return

        # stand
        if mode_lower == "stand":
            if not session or not session["playing"]:
                await ctx.send("🚫 진행 중인 블랙잭 게임이 없습니다. `!블랙잭 start <베팅액>` 으로 시작하세요.", delete_after=10)
                return

            session["playing"] = False
            deck = session["deck"]
            player_cards = session["player_cards"]
            dealer_cards = session["dealer_cards"]
            bet = session["bet"]

            def calc_total(cards):
                total = 0
                aces = 0
                for c in cards:
                    rank = c[:-1]
                    if rank in ("J", "Q", "K"):
                        total += 10
                    elif rank == "A":
                        aces += 1
                        total += 11
                    else:
                        total += int(rank)
                while total > 21 and aces:
                    total -= 10
                    aces -= 1
                return total

            player_total = calc_total(player_cards)
            dealer_total = calc_total(dealer_cards)

            while dealer_total < 17:
                card = deck.pop()
                dealer_cards.append(card)
                dealer_total = calc_total(dealer_cards)

            if dealer_total > 21 or player_total > dealer_total:
                payout = bet * 2
                new_bal = econ.change_balance(guild_id, ctx.author.id, payout)
                title = "🏆 블랙잭 승리!"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"📣 **축하합니다!** 베팅액×2 ({payout}코인) 지급\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.green()
            elif player_total == dealer_total:
                new_bal = econ.change_balance(guild_id, ctx.author.id, bet)
                title = "🤝 블랙잭 무승부"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"🟰 **무승부입니다.** 베팅액 환급\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.gold()
            else:
                new_bal = econ.get_balance(guild_id, ctx.author.id)
                title = "😢 블랙잭 패배"
                desc = (
                    f"당신: {' | '.join(player_cards)} (합: {player_total})\n"
                    f"딜러: {' | '.join(dealer_cards)} (합: {dealer_total})\n\n"
                    f"💔 **패배…** 베팅액 손실\n"
                    f"💰 **현재 잔고:** {new_bal} 코인"
                )
                color = Colour.red()

            embed = Embed(title=title, description=desc, color=color)
            embed.set_footer(text="블랙잭 게임 종료")
            await ctx.send(embed=embed)
            return

        # 그 외 잘못된 모드
        await ctx.send(
            "🚫 올바른 모드를 입력하세요:\n• `!블랙잭 start <베팅액>` 또는 `!블랙잭 hit` 또는 `!블랙잭 stand`",
            delete_after=10
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Gambling(bot))
