import random
import discord
from discord.ext import commands
from discord import app_commands, Embed, Colour

class RPS(commands.Cog):
    """
    • /가위바위보 <가위|바위|보> <베팅액> 또는 !가위바위보 <가위|바위|보> <베팅액>
    • 가위바위보 베팅 게임 (배팅액×2 배당)
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="가위바위보",
        description="가위바위보: 봇과 대결, 베팅액×2 배당"
    )
    @app_commands.describe(선택="‘가위’, ‘바위’, ‘보’", 베팅="베팅할 코인 수(정수)")
    async def rps(self, interaction: discord.Interaction, 선택: str, 베팅: int):
        await interaction.response.defer(ephemeral=True)
        econ = self.bot.get_cog("Economy")
        bal = econ.get_balance(interaction.guild.id, interaction.user.id)

        if 베팅 <= 0:
            await interaction.followup.send("🚫 베팅액은 1 이상이어야 합니다.", ephemeral=True)
            return
        if 베팅 > bal:
            await interaction.followup.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", ephemeral=True)
            return

        moves = {"가위": 0, "바위": 1, "보": 2}
        user_move = moves.get(선택)
        if user_move is None:
            await interaction.followup.send("🚫 ‘가위’, ‘바위’, ‘보’ 중 하나를 입력하세요.", ephemeral=True)
            return

        bot_move = random.choice(list(moves.values()))
        outcome = (user_move - bot_move) % 3

        econ.change_balance(interaction.guild.id, interaction.user.id, -베팅)
        if outcome == 0:
            환급 = 베팅
            새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, 환급)
            desc = (
                f"🤝 **무승부!**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"베팅액 {환급} 코인 환급\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.gold()
        elif outcome == 1:
            새잔고 = econ.change_balance(interaction.guild.id, interaction.user.id, 베팅 * 2)
            desc = (
                f"🏆 **승리!**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"배당 {베팅 * 2} 코인 지급\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.green()
        else:
            새잔고 = econ.get_balance(interaction.guild.id, interaction.user.id)
            desc = (
                f"😢 **패배…**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.red()

        embed = Embed(title="가위바위보 결과", description=desc, color=color)
        embed.set_image(url="https://media.giphy.com/media/3oEjHNTY5U1rEqvmDu/giphy.gif")
        await interaction.followup.send(embed=embed, ephemeral=True)

    @commands.command(name="가위바위보")
    async def rps_prefix(self, ctx: commands.Context, 선택: str, 베팅: int):
        await ctx.trigger_typing()
        econ = self.bot.get_cog("Economy")
        bal = econ.get_balance(ctx.guild.id, ctx.author.id)

        if 베팅 <= 0:
            await ctx.send("🚫 베팅액은 1 이상이어야 합니다.", delete_after=10)
            return
        if 베팅 > bal:
            await ctx.send(f"🚫 잔고가 부족합니다. (현재 잔고: {bal}코인)", delete_after=10)
            return

        moves = {"가위": 0, "바위": 1, "보": 2}
        user_move = moves.get(선택)
        if user_move is None:
            await ctx.send("🚫 ‘가위’, ‘바위’, ‘보’ 중 하나를 입력하세요.", delete_after=10)
            return

        bot_move = random.choice(list(moves.values()))
        outcome = (user_move - bot_move) % 3

        econ.change_balance(ctx.guild.id, ctx.author.id, -베팅)
        if outcome == 0:
            환급 = 베팅
            새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, 환급)
            desc = (
                f"🤝 **무승부!**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"베팅액 {환급} 코인 환급\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.gold()
        elif outcome == 1:
            새잔고 = econ.change_balance(ctx.guild.id, ctx.author.id, 베팅 * 2)
            desc = (
                f"🏆 **승리!**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"배당 {베팅 * 2} 코인 지급\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.green()
        else:
            새잔고 = econ.get_balance(ctx.guild.id, ctx.author.id)
            desc = (
                f"😢 **패배…**\n"
                f"봇: **{list(moves.keys())[bot_move]}**, 당신: **{선택}**\n"
                f"💰 현재 잔고: {새잔고} 코인"
            )
            color = Colour.red()

        embed = Embed(title="가위바위보 결과", description=desc, color=color)
        embed.set_image(url="https://media.giphy.com/media/3oEjHNTY5U1rEqvmDu/giphy.gif")
        await ctx.send(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(RPS(bot))
