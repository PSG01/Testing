import os
import discord
import aiohttp
from discord.ext import commands
from discord import app_commands

RIOT_API_KEY = os.getenv("RIOT_API_KEY")

class LOLSpectator(commands.Cog):
    """
    • /롤내전 <소환사명> 또는 !롤내전 <소환사명>
      - 소환사가 Custom Game 중이면 실시간 스코어보드를 보여줍니다.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._session = aiohttp.ClientSession()

    @commands.command(name="롤내전", help="롤 내전(Custom Game) 실시간 스코어보드 조회")
    async def lol_prefix(self, ctx: commands.Context, summoner: str):
        await ctx.trigger_typing()
        await self._fetch_and_display(ctx, ctx, summoner)

    @app_commands.command(name="롤내전", description="롤 내전(Custom Game) 실시간 스코어보드 조회")
    @app_commands.describe(summoner="조회할 소환사명을 입력하세요.")
    async def lol_slash(self, interaction: discord.Interaction, summoner: str):
        await interaction.response.defer()
        await self._fetch_and_display(interaction, interaction, summoner)

    async def _fetch_and_display(self, ctx_or_interaction, send_ctx, summoner: str):
        # 1) 소환사 ID 가져오기
        url1 = f"https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/{summoner}"
        headers = {"X-Riot-Token": RIOT_API_KEY}
        async with self._session.get(url1, headers=headers) as resp1:
            if resp1.status != 200:
                await send_ctx.send(f"🚫 소환사를 찾을 수 없습니다: {summoner}", delete_after=10)
                return
            data1 = await resp1.json()
            encrypted_id = data1.get("id")

        # 2) 현재 게임 정보 가져오기
        url2 = f"https://kr.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/{encrypted_id}"
        async with self._session.get(url2, headers=headers) as resp2:
            if resp2.status != 200:
                await send_ctx.send("🚫 현재 Custom Game 중이 아닙니다.", delete_after=10)
                return
            data2 = await resp2.json()

        # 3) 블루팀/레드팀 정보 파싱
        participants = data2.get("participants", [])
        blue_team = [p for p in participants if p.get("teamId") == 100]
        red_team = [p for p in participants if p.get("teamId") == 200]

        embed = discord.Embed(title=f"{summoner} 의 Custom Game 스코어보드", color=discord.Colour.blurple())
        def fmt(team_list):
            lines = []
            for p in team_list:
                name = p.get("summonerName")
                champ = p.get("championId")  # 실제 챔피언명 변환 로직이 필요하지만 생략
                kills = p.get("stats", {}).get("kills", 0)
                deaths = p.get("stats", {}).get("deaths", 0)
                assists = p.get("stats", {}).get("assists", 0)
                lines.append(f"{name} - K/D/A: {kills}/{deaths}/{assists}")
            return "\n".join(lines)

        embed.add_field(name="🔵 블루팀", value=fmt(blue_team) or "정보 없음", inline=True)
        embed.add_field(name="🔴 레드팀", value=fmt(red_team) or "정보 없음", inline=True)

        await send_ctx.send(embed=embed)

    def cog_unload(self):
        # 봇 종료 시 aiohttp 세션 닫기
        self.bot.loop.create_task(self._session.close())

async def setup(bot: commands.Bot):
    await bot.add_cog(LOLSpectator(bot))
