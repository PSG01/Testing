import os
import json
import discord
from discord.ext import commands
from discord import app_commands

class Admin(commands.Cog):
    """
    • /설정채널 <#채널> 또는 !설정채널 #채널
      -pip install discord.py yt-dlp python-dotenv
 지정된 채널에서만 봇 명령어 사용을 허용합니다.
    • 지정되지 않은 채널에서 명령 시 경고 메시지 전송
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.path = os.path.join("data", "guild_settings.json")
        if not os.path.isfile(self.path):
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump({}, f, ensure_ascii=False, indent=4)

    @commands.command(
        name="설정채널",
        help="이 명령어가 동작할 채널을 지정합니다. 예: !설정채널 #음악-채널"
    )
    async def set_channel_prefix(self, ctx: commands.Context, channel: discord.TextChannel):
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        data[str(ctx.guild.id)] = channel.id
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        await ctx.send(f"✅ 명령어 사용 채널이 {channel.mention} 로 설정되었습니다.")

    @app_commands.command(
        name="설정채널",
        description="이 명령어가 동작할 채널을 지정합니다."
    )
    @app_commands.describe(channel="봇 명령어를 허용할 채널을 멘션으로 지정하세요.")
    async def set_channel_slash(self, interaction: discord.Interaction, channel: discord.TextChannel):
        await interaction.response.defer(ephemeral=True)

        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        data[str(interaction.guild.id)] = channel.id
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

        await interaction.followup.send(f"✅ 명령어 사용 채널이 {channel.mention} 로 설정되었습니다.", ephemeral=True)

    def is_allowed(self, guild_id: int, channel_id: int) -> bool:
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)
        allowed = data.get(str(guild_id))
        return (allowed is not None and allowed == channel_id)

    @commands.Cog.listener()
    async def on_slash_command(self, interaction: discord.Interaction):
        # 슬래시 커맨드 사용 시 허용 채널 검사
        guild_id = interaction.guild.id
        channel_id = interaction.channel.id
        if not self.is_allowed(guild_id, channel_id):
            await interaction.response.send_message(
                "🚫 이 명령어는 지정된 채널에서만 사용할 수 있습니다.",
                ephemeral=True
            )

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        # 프리픽스 명령어 사용 시 허용 채널 검사
        if message.author.bot:
            return
        if not message.content.startswith("!"):
            return
        guild_id = message.guild.id
        channel_id = message.channel.id
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)
        allowed = data.get(str(guild_id))
        if allowed and channel_id != allowed:
            await message.channel.send(
                "🚫 이 명령어는 지정된 채널에서만 사용할 수 있습니다.",
                delete_after=5
            )

async def setup(bot: commands.Bot):
    await bot.add_cog(Admin(bot))
