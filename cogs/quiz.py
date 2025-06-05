import asyncio
import discord
from discord.ext import commands
from discord import app_commands

class Quiz(commands.Cog):
    """
    • /퀴즈 또는 !퀴즈 로 15초 제한 퀴즈를 시작합니다.
    • /정답 <답> 또는 !정답 <답> 으로 제출
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.current_question = {}      # {guild_id: question_text}
        self.current_answer = {}        # {guild_id: answer_text}
        self.question_active = {}       # {guild_id: bool}

    @commands.command(name="퀴즈", help="15초 제한 퀴즈를 시작합니다.")
    async def quiz_prefix(self, ctx: commands.Context):
        if self.question_active.get(ctx.guild.id, False):
            await ctx.send("🚫 이미 진행 중인 퀴즈가 있습니다.", delete_after=5)
            return

        question = "우리나라 수도는 어디일까요?"
        answer = "서울"
        self.current_question[ctx.guild.id] = question
        self.current_answer[ctx.guild.id] = answer
        self.question_active[ctx.guild.id] = True

        embed = discord.Embed(
            title="퀴즈 타임! 🎉",
            description=f"문제: **{question}**\n15초 내에 `/정답 <답>` 으로 제출하세요!",
            color=discord.Colour.blue()
        )
        await ctx.send(embed=embed)

        await asyncio.sleep(15)
        if self.question_active.get(ctx.guild.id, False):
            self.question_active[ctx.guild.id] = False
            await ctx.send(f"⏰ 시간이 끝났습니다! 정답은 **{answer}** 였습니다.")

    @commands.command(name="정답", help="퀴즈 정답을 제출합니다. 예: !정답 서울")
    async def answer_prefix(self, ctx: commands.Context, *, guess: str):
        if not self.question_active.get(ctx.guild.id, False):
            await ctx.send("🚫 현재 진행 중인 퀴즈가 없습니다.", delete_after=5)
            return

        correct = self.current_answer.get(ctx.guild.id, "").strip().lower()
        if guess.strip().lower() == correct:
            self.question_active[ctx.guild.id] = False
            await ctx.send(f"🎊 정답입니다! **{correct}** 가 맞았습니다.")
        else:
            await ctx.send("❌ 틀렸습니다. 다시 시도해 보세요.", delete_after=5)

    @app_commands.command(name="퀴즈", description="15초 제한 퀴즈를 시작합니다.")
    async def quiz_slash(self, interaction: discord.Interaction):
        if self.question_active.get(interaction.guild.id, False):
            await interaction.response.send_message("🚫 이미 진행 중인 퀴즈가 있습니다.", ephemeral=True)
            return

        question = "우리나라 수도는 어디일까요?"
        answer = "서울"
        self.current_question[interaction.guild.id] = question
        self.current_answer[interaction.guild.id] = answer
        self.question_active[interaction.guild.id] = True

        embed = discord.Embed(
            title="퀴즈 타임! 🎉",
            description=f"문제: **{question}**\n15초 내에 `/정답 <답>` 으로 제출하세요!",
            color=discord.Colour.blue()
        )
        await interaction.response.send_message(embed=embed)

        await asyncio.sleep(15)
        if self.question_active.get(interaction.guild.id, False):
            self.question_active[interaction.guild.id] = False
            await interaction.channel.send(f"⏰ 시간이 끝났습니다! 정답은 **{answer}** 였습니다.")

    @app_commands.command(name="정답", description="퀴즈 정답을 제출합니다.")
    @app_commands.describe(guess="퀴즈 정답을 입력하세요.")
    async def answer_slash(self, interaction: discord.Interaction, guess: str):
        if not self.question_active.get(interaction.guild.id, False):
            await interaction.response.send_message("🚫 현재 진행 중인 퀴즈가 없습니다.", ephemeral=True)
            return

        correct = self.current_answer.get(interaction.guild.id, "").strip().lower()
        if guess.strip().lower() == correct:
            self.question_active[interaction.guild.id] = False
            await interaction.response.send_message(f"🎊 정답입니다! **{correct}** 가 맞았습니다.", ephemeral=True)
        else:
            await interaction.response.send_message("❌ 틀렸습니다. 다시 시도해 보세요.", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Quiz(bot))
