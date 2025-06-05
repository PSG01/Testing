import random
import discord
from discord.ext import commands
from discord import app_commands

class Hangman(commands.Cog):
    """
    • /행맨 start <베팅액> 또는 !행맨 start <베팅액> 으로 게임 시작
    • /행맨 <한 글자> 또는 !행맨 <한 글자> 로 점수(베팅)와 정답 판별
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # {guild_id: {"word": str, "masked": List[str], "attempts": int, "bet": int, "playing": bool}}
        self.games = {}

    @commands.command(name="행맨", help="행맨 게임: !행맨 start <베팅액> 으로 시작, !행맨 <한 글자> 로 추측")
    async def hangman_prefix(self, ctx: commands.Context, *args):
        if len(args) == 0:
            await ctx.send("🚫 사용법: !행맨 start <베팅액> 또는 !행맨 <한 글자>", delete_after=5)
            return

        guild_id = ctx.guild.id
        econ = self.bot.get_cog("Economy")

        if args[0] == "start":
            if len(args) != 2 or not args[1].isdigit():
                await ctx.send("🚫 사용법: !행맨 start <베팅액>", delete_after=5)
                return
            bet = int(args[1])
            bal = econ.get_balance(guild_id, ctx.author.id)
            if bet <= 0 or bet > bal:
                await ctx.send(f"🚫 유효한 베팅액(현재 잔고: {bal}코인)을 입력하세요.", delete_after=5)
                return
            econ.change_balance(guild_id, ctx.author.id, -bet)
            word_list = ["python", "discord", "hangman", "programming", "music"]
            word = random.choice(word_list)
            masked = ["_" for _ in word]
            self.games[guild_id] = {
                "word": word,
                "masked": masked,
                "attempts": 6,
                "bet": bet,
                "playing": True
            }
            await ctx.send(f"🔤 행맨 게임 시작! 남은 기회: 6, 단어: {' '.join(masked)}")
        else:
            guess = args[0].lower()
            game = self.games.get(guild_id)
            if not game or not game["playing"]:
                await ctx.send("🚫 먼저 `!행맨 start <베팅액>` 으로 게임을 시작하세요.", delete_after=5)
                return
            word = game["word"]
            masked = game["masked"]
            if guess in word:
                for idx, ch in enumerate(word):
                    if ch == guess:
                        masked[idx] = guess
                if "_" not in masked:
                    # 정답
                    game["playing"] = False
                    win_amount = game["bet"] * 2
                    econ.change_balance(guild_id, ctx.author.id, win_amount)
                    await ctx.send(f"🎉 정답! **{word}**. 보상으로 {win_amount}코인 획득!")
                else:
                    await ctx.send(f"✅ 정답에 포함된 글자입니다: {' '.join(masked)}")
            else:
                game["attempts"] -= 1
                if game["attempts"] <= 0:
                    game["playing"] = False
                    await ctx.send(f"💀 실패… 정답은 **{word}** 였습니다.")
                else:
                    await ctx.send(f"❌ 틀렸습니다. 남은 기회: {game['attempts']}, 현재 단어: {' '.join(masked)}")

    @app_commands.command(name="행맨", description="행맨 게임: /행맨 start <베팅액> 또는 /행맨 <한 글자>")
    @app_commands.describe(mode="start|<글자>", guess="추측할 한 글자")
    async def hangman_slash(self, interaction: discord.Interaction, mode: str, guess: str = None):
        if mode == "start":
            if guess is None or not guess.isdigit():
                await interaction.response.send_message("🚫 사용법: /행맨 start <베팅액>", ephemeral=True)
                return
            bet = int(guess)
            econ = self.bot.get_cog("Economy")
            bal = econ.get_balance(interaction.guild.id, interaction.user.id)
            if bet <= 0 or bet > bal:
                await interaction.response.send_message(f"🚫 유효한 베팅액(현재 잔고: {bal}코인)을 입력하세요.", ephemeral=True)
                return
            econ.change_balance(interaction.guild.id, interaction.user.id, -bet)
            word_list = ["python", "discord", "hangman", "programming", "music"]
            word = random.choice(word_list)
            masked = ["_" for _ in word]
            self.games[interaction.guild.id] = {
                "word": word,
                "masked": masked,
                "attempts": 6,
                "bet": bet,
                "playing": True
            }
            await interaction.response.send_message(f"🔤 행맨 게임 시작! 남은 기회: 6, 단어: {' '.join(masked)}", ephemeral=True)
        else:
            game = self.games.get(interaction.guild.id)
            if not game or not game["playing"]:
                await interaction.response.send_message("🚫 먼저 `/행맨 start <베팅액>` 으로 게임을 시작하세요.", ephemeral=True)
                return
            if not mode or len(mode) != 1:
                await interaction.response.send_message("🚫 한 글자만 입력하세요.", ephemeral=True)
                return
            guess_char = mode.lower()
            word = game["word"]
            masked = game["masked"]
            if guess_char in word:
                for idx, ch in enumerate(word):
                    if ch == guess_char:
                        masked[idx] = guess_char
                if "_" not in masked:
                    game["playing"] = False
                    win_amount = game["bet"] * 2
                    econ = self.bot.get_cog("Economy")
                    econ.change_balance(interaction.guild.id, interaction.user.id, win_amount)
                    await interaction.response.send_message(f"🎉 정답! **{word}**. 보상: {win_amount}코인", ephemeral=True)
                else:
                    await interaction.response.send_message(f"✅ 정답에 포함된 글자입니다: {' '.join(masked)}", ephemeral=True)
            else:
                game["attempts"] -= 1
                if game["attempts"] <= 0:
                    game["playing"] = False
                    await interaction.response.send_message(f"💀 실패… 정답은 **{word}** 였습니다.", ephemeral=True)
                else:
                    await interaction.response.send_message(
                        f"❌ 틀렸습니다. 남은 기회: {game['attempts']}, 현재 단어: {' '.join(masked)}",
                        ephemeral=True
                    )

async def setup(bot: commands.Bot):
    await bot.add_cog(Hangman(bot))
