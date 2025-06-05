# cogs/playlist_slash.py

import os
import json
import discord
from discord.ext import commands
from discord import app_commands
from utils.ytdl import ytdl

class Playlist(commands.Cog):
    """
    • /플레이리스트 <이름> [URL]
      - URL이 있으면 해당 이름으로 재생목록 저장
      - URL 없으면 저장된 재생목록을 Music Cog의 큐에 추가
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.path = os.path.join("data", "playlists.json")
        # playlists.json 파일이 없다면 생성
        if not os.path.isfile(self.path):
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump({}, f, ensure_ascii=False, indent=4)

    @commands.command(
        name="플레이리스트",
        help="저장/불러오기: !플레이리스트 <이름> [재생목록 URL]"
    )
    async def playlist_prefix(self, ctx: commands.Context, name: str = None, url: str = None):
        # 인자 체크
        if name is None:
            await ctx.send(
                "🚫 사용법: `!플레이리스트 <이름> [URL]`\n"
                "• URL을 넣으면 저장, 없으면 불러오기",
                delete_after=8
            )
            return

        # 파일 로드
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        gid = str(ctx.guild.id)
        uid = str(ctx.author.id)
        data.setdefault(gid, {}).setdefault(uid, {})

        # -- 저장 모드 --
        if url:
            try:
                loop = self.bot.loop
                # yt-dlp로 재생목록 메타데이터만 추출
                info = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=False))
            except Exception:
                await ctx.send(
                    "🚫 재생목록 불러오기 실패. 비공개이거나 유효하지 않을 수 있습니다.",
                    delete_after=10
                )
                return

            entries = info.get("entries", [])
            saved = []
            for entry in entries:
                if not entry:
                    continue
                vid = entry.get("id") or entry.get("url")
                if vid:
                    video_url = f"https://www.youtube.com/watch?v={vid}"
                    saved.append(video_url)

            # json에 저장
            data[gid][uid][name] = saved
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

            await ctx.send(f"✅ **{len(saved)}곡**을 **{name}** 으로 저장했습니다.", delete_after=10)

        # -- 불러오기 모드 --
        else:
            user_ply = data[gid][uid].get(name)
            if not user_ply:
                await ctx.send("🚫 해당 이름의 재생목록이 없습니다.", delete_after=5)
                return

            music_cog = self.bot.get_cog("Music")
            for video_url in user_ply:
                music_cog.guild_queues.setdefault(ctx.guild.id, []).append(video_url)

            await ctx.send(f"✅ **{len(user_ply)}곡**을 대기열에 추가했습니다.", delete_after=8)

    @app_commands.command(
        name="플레이리스트",
        description="저장/불러오기: /플레이리스트 <이름> [재생목록 URL]"
    )
    @app_commands.describe(
        name="재생목록 이름",
        url="유튜브 재생목록 URL (선택)"
    )
    async def playlist_slash(self, interaction: discord.Interaction, name: str, url: str = None):
        await interaction.response.defer(ephemeral=True)

        # 파일 로드
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        gid = str(interaction.guild.id)
        uid = str(interaction.user.id)
        data.setdefault(gid, {}).setdefault(uid, {})

        # -- 저장 모드 --
        if url:
            try:
                loop = self.bot.loop
                info = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=False))
            except Exception:
                await interaction.followup.send(
                    "🚫 재생목록 불러오기 실패. 비공개이거나 유효하지 않을 수 있습니다.",
                    ephemeral=True
                )
                return

            entries = info.get("entries", [])
            saved = []
            for entry in entries:
                if not entry:
                    continue
                vid = entry.get("id") or entry.get("url")
                if vid:
                    video_url = f"https://www.youtube.com/watch?v={vid}"
                    saved.append(video_url)

            data[gid][uid][name] = saved
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

            await interaction.followup.send(
                f"✅ **{len(saved)}곡**을 **{name}** 으로 저장했습니다.",
                ephemeral=True
            )

        # -- 불러오기 모드 --
        else:
            user_ply = data[gid][uid].get(name)
            if not user_ply:
                await interaction.followup.send("🚫 해당 이름의 재생목록이 없습니다.", ephemeral=True)
                return

            music_cog = self.bot.get_cog("Music")
            for video_url in user_ply:
                music_cog.guild_queues.setdefault(interaction.guild.id, []).append(video_url)

            await interaction.followup.send(
                f"✅ **{len(user_ply)}곡**을 대기열에 추가했습니다.",
                ephemeral=True
            )

async def setup(bot: commands.Bot):
    await bot.add_cog(Playlist(bot))
