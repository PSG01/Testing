import random
import discord
from discord.ext import commands
from discord import app_commands  # app_commands 임포트 추가

class Board(commands.Cog):
    """
    • /주사위게임 또는 !주사위게임
      - 베팅 없이 주사위를 여러 번 던져서 점수와 자원을 획득합니다.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="주사위게임", help="주사위를 굴려 점수와 자원을 획득합니다. (베팅 없음)")
    async def board_prefix(self, ctx: commands.Context):
        rolls = [random.randint(1, 6) for _ in range(3)]  # 예시: 3번 주사위 굴림
        total = sum(rolls)
        resource = total * 10
        await ctx.send(f"🎲 주사위 결과: {rolls} → 총 합계: {total}\n🪵 자원 획득량: {resource}")

    @app_commands.command(name="주사위게임", description="주사위를 굴려 점수와 자원을 획득합니다.")
    async def board_slash(self, interaction: discord.Interaction):
        rolls = [random.randint(1, 6) for _ in range(3)]
        total = sum(rolls)
        resource = total * 10
        await interaction.response.send_message(
            f"🎲 주사위 결과: {rolls} → 총 합계: {total}\n🪵 자원 획득량: {resource}",
            ephemeral=True
        )

async def setup(bot: commands.Bot):
    await bot.add_cog(Board(bot))
