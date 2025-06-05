import random
import discord
from discord.ext import commands
from discord import app_commands, Embed, Colour
from discord.ui import View, Button

class Dungeon(commands.Cog):
    """
    • /던전 start <베팅액> 또는 !던전 start <베팅액> 으로 전투 시작
    • 전투 중에는 Attack/Heal 버튼을 눌러 즉시 행동
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # {guild_id: {"player_hp": int, "monster_hp": int, "bet": int, "playing": bool, "message_id": int}}
        self.sessions: dict[int, dict] = {}

    class DungeonView(View):
        def __init__(self, cog: "Dungeon", guild_id: int):
            super().__init__(timeout=None)
            self.cog = cog
            self.guild_id = guild_id

        @discord.ui.button(label="⚔️ Attack", style=discord.ButtonStyle.red, custom_id="dungeon_attack")
        async def attack_button(self, interaction: discord.Interaction, button: Button):
            session = self.cog.sessions.get(self.guild_id)
            if not session or not session.get("playing"):
                await interaction.response.send_message("🚫 전투 중인 세션이 없습니다.", ephemeral=True)
                return

            # 1) 플레이어 공격
            dmg = random.randint(10, 30)
            session["monster_hp"] = max(session["monster_hp"] - dmg, 0)

            # 2) 몬스터 상태 확인
            if session["monster_hp"] <= 0:
                session["playing"] = False
                reward = session["bet"] * 2
                econ = self.cog.bot.get_cog("Economy")
                econ.change_balance(interaction.guild.id, interaction.user.id, reward)
                embed = Embed(
                    title="💥 당신의 승리!",
                    description=(
                        f"🗡️ 당신이 몬스터에게 {dmg} 데미지를 입혔습니다.\n"
                        f"몬스터 HP: 0 (패배)\n\n"
                        f"🎉 보상: {reward} 코인\n"
                        f"💰 현재 잔고: {econ.get_balance(interaction.guild.id, interaction.user.id)} 코인"
                    ),
                    color=Colour.green()
                )
                for child in self.children:
                    child.disabled = True
                await interaction.response.edit_message(embed=embed, view=self)
                return

            # 3) 몬스터 반격
            mdmg = random.randint(5, 25)
            session["player_hp"] = max(session["player_hp"] - mdmg, 0)

            # 4) 플레이어 상태 확인
            if session["player_hp"] <= 0:
                session["playing"] = False
                embed = Embed(
                    title="☠️ 당신의 패배…",
                    description=(
                        f"🗡️ 당신이 몬스터에게 {dmg} 데미지를 입혔습니다.\n"
                        f"몬스터 HP: {session['monster_hp']}\n\n"
                        f"🩸 몬스터의 반격: {mdmg} 데미지\n"
                        f"플레이어 HP: 0 (패배)\n\n"
                        f"💰 현재 잔고: {self.cog.bot.get_cog('Economy').get_balance(interaction.guild.id, interaction.user.id)} 코인"
                    ),
                    color=Colour.red()
                )
                for child in self.children:
                    child.disabled = True
                await interaction.response.edit_message(embed=embed, view=self)
                return

            # 5) 전투 지속
            embed = Embed(
                title="⚔️ 전투 진행 중",
                description=(
                    f"🗡️ 당신 공격: {dmg} 데미지 → 몬스터 HP: {session['monster_hp']}\n"
                    f"🩸 몬스터 반격: {mdmg} 데미지 → 플레이어 HP: {session['player_hp']}"
                ),
                color=Colour.orange()
            )
            await interaction.response.edit_message(embed=embed, view=self)

        @discord.ui.button(label="💖 Heal", style=discord.ButtonStyle.green, custom_id="dungeon_heal")
        async def heal_button(self, interaction: discord.Interaction, button: Button):
            session = self.cog.sessions.get(self.guild_id)
            if not session or not session.get("playing"):
                await interaction.response.send_message("🚫 전투 중인 세션이 없습니다.", ephemeral=True)
                return

            # 1) 플레이어 회복
            heal_amt = random.randint(15, 30)
            session["player_hp"] = min(session["player_hp"] + heal_amt, 100)

            # 2) 몬스터 반격
            mdmg = random.randint(5, 25)
            session["player_hp"] = max(session["player_hp"] - mdmg, 0)

            # 3) 플레이어 상태 확인
            if session["player_hp"] <= 0:
                session["playing"] = False
                embed = Embed(
                    title="☠️ 당신의 패배…",
                    description=(
                        f"💖 당신 회복: {heal_amt} HP → 플레이어 HP: 0 (패배)\n"
                        f"🩸 몬스터 반격: {mdmg} 데미지\n"
                        f"💰 현재 잔고: {self.cog.bot.get_cog('Economy').get_balance(interaction.guild.id, interaction.user.id)} 코인"
                    ),
                    color=Colour.red()
                )
                for child in self.children:
                    child.disabled = True
                await interaction.response.edit_message(embed=embed, view=self)
                return

            # 4) 전투 지속
            embed = Embed(
                title="⚔️ 전투 진행 중",
                description=(
                    f"💖 당신 회복: {heal_amt} HP → 플레이어 HP: {session['player_hp']}\n"
                    f"🩸 몬스터 반격: {mdmg} 데미지 → 플레이어 HP: {session['player_hp']}"
                ),
                color=Colour.orange()
            )
            await interaction.response.edit_message(embed=embed, view=self)

    # ──────────────────────────────────────────────────────────────────────────
    # 1) 슬래시 커맨드에서 이미 작동하던 start 로직
    # ──────────────────────────────────────────────────────────────────────────
    @app_commands.command(name="던전", description="텍스트 던전 RPG: /던전 start <베팅액>")
    @app_commands.describe(mode="start", amount="start 모드일 때 베팅액")
    async def dungeon_slash(self, interaction: discord.Interaction, mode: str, amount: int = 0):
        if mode != "start":
            await interaction.response.send_message("🚫 올바른 명령어: `/던전 start <베팅액>`", ephemeral=True)
            return

        econ = self.bot.get_cog("Economy")
        gid = interaction.guild.id
        bet = amount
        bal = econ.get_balance(gid, interaction.user.id)

        if bet <= 0 or bet > bal:
            await interaction.response.send_message(f"🚫 유효한 베팅액(현재 잔고: {bal}코인)을 입력하세요.", ephemeral=True)
            return

        # 베팅 차감 및 세션 초기화
        econ.change_balance(gid, interaction.user.id, -bet)
        self.sessions[gid] = {
            "player_hp": 100,
            "monster_hp": 100,
            "bet": bet,
            "playing": True,
            "message_id": None
        }

        # 임베드 생성 + 버튼 뷰
        embed = Embed(
            title="⚔️ 던전 RPG 시작",
            description=(
                f"플레이어 HP: 100\n"
                f"몬스터 HP: 100\n\n"
                f"버튼을 클릭하여 행동하세요!"
            ),
            color=Colour.blue()
        )
        view = Dungeon.DungeonView(self, gid)

        message = await interaction.response.send_message(embed=embed, view=view)
        # 메시지 ID 저장
        self.sessions[gid]["message_id"] = (await message.original_response()).id

    # ──────────────────────────────────────────────────────────────────────────
    # 2) 프리픽스 커맨드에서 start 를 눌렀을 때 동일하게 버튼 임베드를 보내도록 변경
    # ──────────────────────────────────────────────────────────────────────────
    @commands.command(name="던전", help="텍스트 던전 RPG: !던전 start <베팅액>")
    async def dungeon_prefix(self, ctx: commands.Context, *args):
        econ = self.bot.get_cog("Economy")
        gid = ctx.guild.id

        if len(args) == 0:
            await ctx.send("🚫 사용법: !던전 start <베팅액>", delete_after=5)
            return

        # start 모드 처리 (버튼 embed 송출)
        if args[0] == "start":
            if len(args) != 2 or not args[1].isdigit():
                await ctx.send("🚫 사용법: !던전 start <베팅액>", delete_after=5)
                return
            bet = int(args[1])
            bal = econ.get_balance(gid, ctx.author.id)
            if bet <= 0 or bet > bal:
                await ctx.send(f"🚫 유효한 베팅액(현재 잔고: {bal}코인)을 입력하세요.", delete_after=5)
                return

            # 베팅 차감 및 세션 초기화
            econ.change_balance(gid, ctx.author.id, -bet)
            self.sessions[gid] = {
                "player_hp": 100,
                "monster_hp": 100,
                "bet": bet,
                "playing": True,
                "message_id": None
            }

            # 버튼 포함 임베드 생성
            embed = Embed(
                title="⚔️ 던전 RPG 시작",
                description=(
                    f"플레이어 HP: 100\n"
                    f"몬스터 HP: 100\n\n"
                    f"버튼을 클릭하여 행동하세요!"
                ),
                color=Colour.blue()
            )
            view = Dungeon.DungeonView(self, gid)

            message = await ctx.send(embed=embed, view=view)
            # 메시지 ID 저장
            self.sessions[gid]["message_id"] = message.id
            return

        # start 이후에는 버튼 뷰를 통해 attack/heal 처리되므로
        # 사용자에게 텍스트 명령은 더 이상 필요 없습니다.
        await ctx.send("❗ 버튼을 이용해 행동할 수 있습니다. `/던전 start <베팅액>` 이후 버튼을 클릭하세요.", delete_after=5)


async def setup(bot: commands.Bot):
    await bot.add_cog(Dungeon(bot))
