# cogs/music.py

import discord
from discord.ext import commands
from discord import Embed, Colour
import asyncio
import os
import json
import yt_dlp as youtube_dl
from typing import Dict, List
from discord.ui import View, Button, button

ytdl_format_options = {
    "format": "bestaudio/best",
    "quiet": True,
    "no_warnings": True,
    "default_search": "auto",
    "source_address": "0.0.0.0",
}
ytdl = youtube_dl.YoutubeDL(ytdl_format_options)


class Music(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        # guild_id -> 지정된 뮤직 채널 ID
        self.music_channel_per_guild: Dict[int, int] = {}
        self.channel_path = os.path.join("data", "music_channels.json")
        if os.path.isfile(self.channel_path):
            with open(self.channel_path, "r", encoding="utf-8") as f:
                self.music_channel_per_guild = {int(k): v for k, v in json.load(f).items()}
        else:
            os.makedirs("data", exist_ok=True)
            with open(self.channel_path, "w", encoding="utf-8") as f:
                json.dump({}, f)
        # guild_id -> List[Dict] (각 곡 정보: url, title, duration, uploader, requester, thumbnail)
        self.guild_queues: Dict[int, List[Dict]] = {}
        # guild_id -> 현재 재생 중 음성 클라이언트
        self.voice_clients: Dict[int, discord.VoiceClient] = {}
        # guild_id -> 현재 재생 중 메시지 객체 (임베드 삭제용)
        self.now_playing_msg: Dict[int, discord.Message] = {}

        # guild_id -> 플레이리스트 이름별 URL 목록 저장
        self.playlist_path = os.path.join("data", "playlists.json")
        if os.path.isfile(self.playlist_path):
            with open(self.playlist_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
                self.playlists: Dict[int, Dict[str, List[str]]] = {int(g): v for g, v in raw.items()}
        else:
            self.playlists = {}

    async def _delete_after(self, msg: discord.Message, delay: float = 5.0):
        try:
            await asyncio.sleep(delay)
            await msg.delete()
        except Exception:
            pass

    async def cleanup_now_playing(self, guild_id: int, delay: float = 5.0):
        msg = self.now_playing_msg.pop(guild_id, None)
        if msg:
            asyncio.create_task(self._delete_after(msg, delay))

    def save_playlists(self):
        os.makedirs("data", exist_ok=True)
        with open(self.playlist_path, "w", encoding="utf-8") as f:
            json.dump({str(g): v for g, v in self.playlists.items()}, f, ensure_ascii=False, indent=4)

    # 1) 지정된 뮤직 채널 검사
    def is_music_channel(self, ctx) -> bool:
        guild_id = ctx.guild.id
        if guild_id not in self.music_channel_per_guild:
            return False
        return ctx.channel.id == self.music_channel_per_guild[guild_id]

    # 2) 곡 정보 추출 (비동기)
    async def extract_info(self, search: str) -> Dict:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(search, download=False))
        if "entries" in data:
            data = data["entries"][0]
        return {
            "webpage_url": data.get("webpage_url"),
            "title": data.get("title"),
            "duration": data.get("duration"),
            "uploader": data.get("uploader"),
            "thumbnail": data.get("thumbnail"),
        }

    # 3) 재생 함수: 큐에서 다음 곡 가져와 플레이
    async def play_next(self, guild_id: int):
        queue = self.guild_queues.get(guild_id, [])
        voice_client = self.voice_clients.get(guild_id)
        if not queue or not voice_client or not voice_client.is_connected():
            if voice_client and voice_client.is_connected():
                await voice_client.disconnect()
            self.voice_clients.pop(guild_id, None)
            self.now_playing_msg.pop(guild_id, None)
            return

        track = queue.pop(0)
        source = await discord.FFmpegOpusAudio.from_probe(
            track["webpage_url"], before_options="-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5"
        )
        voice_client.play(
            source, after=lambda e: asyncio.run_coroutine_threadsafe(self.play_next(guild_id), self.bot.loop)
        )

        channel_id = self.music_channel_per_guild.get(guild_id)
        channel = self.bot.get_channel(channel_id)
        await self.cleanup_now_playing(guild_id)
        embed = self.build_now_playing_embed(guild_id, track)
        self.now_playing_msg[guild_id] = await channel.send(embed=embed)

    # 4) 지금 재생 중 임베드 생성
    def build_now_playing_embed(self, guild_id: int, track: Dict) -> Embed:
        url = track["webpage_url"]
        title = track["title"]
        duration = track["duration"]
        uploader = track["uploader"]
        requester = track["requester"]
        thumbnail_url = track["thumbnail"]

        minutes, seconds = divmod(duration or 0, 60)
        time_str = f"{minutes:02d}:{seconds:02d}"

        embed = Embed(title="🎶 지금 재생 중", colour=Colour.gold())
        embed.add_field(name="곡 정보", value=f"[{title}]({url})\n```시간: {time_str}```", inline=False)
        embed.add_field(
            name="요청자 · 업로더", value=f"**요청자:** {requester.mention}\n**업로더:** {uploader}", inline=True
        )
        if thumbnail_url:
            embed.set_thumbnail(url=thumbnail_url)

        queue_len = len(self.guild_queues.get(guild_id, []))
        embed.set_footer(text=f"대기열 곡 수: {queue_len}곡")
        return embed

    # 5) 큐 임베드 생성 (페이징 지원)
    async def build_queue_embed(self, guild_id: int, page: int) -> Embed:
        queue = self.guild_queues.get(guild_id, [])
        total_pages = max(1, (len(queue) - 1) // 10 + 1)
        embed = Embed(title=f"📋 플레이리스트 ({page + 1}/{total_pages})", colour=Colour.blue())

        if not queue:
            embed.description = "대기열에 곡이 없습니다."
            return embed

        start = page * 10
        end = start + 10
        lines = []
        for idx, track in enumerate(queue[start:end], start=start + 1):
            title = track.get("title", "제목 없음")
            url = track.get("webpage_url", "")
            lines.append(f"**{idx}.** [{title}]({url})")

        embed.description = "\n".join(lines)
        embed.set_footer(text=f"총 곡 수: {len(queue)}곡 | 페이지: {page + 1}/{total_pages}")
        return embed

    # 6) 큐 페이지 네비게이션 View
    class QueueNavView(View):
        def __init__(self, cog: "Music", guild_id: int):
            super().__init__(timeout=120)
            self.cog = cog
            self.guild_id = guild_id
            self.current_page = 0

        @button(label="◀", style=discord.ButtonStyle.primary, custom_id="prev_page")
        async def prev_page(self, interaction: discord.Interaction, button: Button):
            if self.current_page > 0:
                self.current_page -= 1
                embed = await self.cog.build_queue_embed(self.guild_id, self.current_page)
                await interaction.response.edit_message(embed=embed, view=self)

        @button(label="▶", style=discord.ButtonStyle.primary, custom_id="next_page")
        async def next_page(self, interaction: discord.Interaction, button: Button):
            queue = self.cog.guild_queues.get(self.guild_id, [])
            max_page = (len(queue) - 1) // 10
            if self.current_page < max_page:
                self.current_page += 1
                embed = await self.cog.build_queue_embed(self.guild_id, self.current_page)
                await interaction.response.edit_message(embed=embed, view=self)

    # ================================
    # 커맨드 정의
    # ================================

    @commands.command(name="setmusicchannel")
    @commands.has_guild_permissions(manage_guild=True)
    async def set_music_channel(self, ctx: commands.Context, channel: discord.TextChannel = None):
        """뮤직 채널을 지정합니다. (관리자 권한 필요)"""
        target = channel or ctx.channel
        self.music_channel_per_guild[ctx.guild.id] = target.id
        with open(self.channel_path, "w", encoding="utf-8") as f:
            json.dump({str(k): v for k, v in self.music_channel_per_guild.items()}, f, ensure_ascii=False, indent=4)
        await ctx.send(f"✅ 이 서버의 뮤직 채널이 {target.mention}(으)로 설정되었습니다.")

    @commands.command(name="join")
    async def join(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        if not ctx.author.voice or not ctx.author.voice.channel:
            await ctx.send("음성 채널에 먼저 참여해주세요.")
            return
        vc = ctx.author.voice.channel
        existing = discord.utils.get(self.bot.voice_clients, guild=ctx.guild)
        if existing and existing.is_connected():
            return
        self.voice_clients[ctx.guild.id] = await vc.connect()

    @commands.command(name="leave")
    async def leave(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        voice_client = self.voice_clients.get(ctx.guild.id)
        if voice_client and voice_client.is_connected():
            await voice_client.disconnect()
        self.voice_clients.pop(ctx.guild.id, None)
        self.guild_queues.pop(ctx.guild.id, None)
        self.now_playing_msg.pop(ctx.guild.id, None)
        await ctx.send("음악 재생을 중단하고 음성 채널에서 나왔습니다.")

    @commands.command(name="play")
    async def play(self, ctx: commands.Context, *, search: str):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return

        voice_client = self.voice_clients.get(ctx.guild.id)
        if not voice_client or not voice_client.is_connected():
            if not ctx.author.voice or not ctx.author.voice.channel:
                await ctx.send("음성 채널에 먼저 참여해주세요.")
                return
            vc = ctx.author.voice.channel
            voice_client = await vc.connect()
            self.voice_clients[ctx.guild.id] = voice_client

        try:
            info = await self.extract_info(search)
        except Exception:
            await ctx.send("곡 정보를 가져오는 중 오류가 발생했습니다.")
            return

        track = {
            "webpage_url": info["webpage_url"],
            "title": info["title"],
            "duration": info["duration"],
            "uploader": info["uploader"],
            "thumbnail": info["thumbnail"],
            "requester": ctx.author,
        }

        queue = self.guild_queues.setdefault(ctx.guild.id, [])
        queue.append(track)

        if not voice_client.is_playing() and not voice_client.is_paused():
            await self.play_next(ctx.guild.id)
        else:
            embed = await self.build_queue_embed(ctx.guild.id, 0)
            view = Music.QueueNavView(self, ctx.guild.id)
            await ctx.send(embed=embed, view=view)

    @commands.command(name="skip")
    async def skip(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        voice_client = self.voice_clients.get(ctx.guild.id)
        if not voice_client or not voice_client.is_connected() or not voice_client.is_playing():
            await ctx.send("재생 중인 곡이 없습니다.")
            return
        voice_client.stop()
        await ctx.send("⏭ 다음 곡으로 건너뜁니다.")

    @commands.command(name="pause")
    async def pause(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        voice_client = self.voice_clients.get(ctx.guild.id)
        if voice_client and voice_client.is_playing():
            voice_client.pause()
            await ctx.send("⏸ 재생 일시정지되었습니다.")

    @commands.command(name="resume")
    async def resume(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        voice_client = self.voice_clients.get(ctx.guild.id)
        if voice_client and voice_client.is_paused():
            voice_client.resume()
            await ctx.send("▶ 재생을 다시 시작합니다.")

    @commands.command(name="queue")
    async def queue_list(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        embed = await self.build_queue_embed(ctx.guild.id, 0)
        view = Music.QueueNavView(self, ctx.guild.id)
        await ctx.send(embed=embed, view=view)

    @commands.command(name="stop")
    async def stop(self, ctx: commands.Context):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        voice_client = self.voice_clients.get(ctx.guild.id)
        if voice_client:
            voice_client.stop()
            await voice_client.disconnect()
        self.guild_queues.pop(ctx.guild.id, None)
        self.voice_clients.pop(ctx.guild.id, None)
        self.now_playing_msg.pop(ctx.guild.id, None)
        await ctx.send("⏹ 재생 중인 음악을 모두 중단하고 음성 채널에서 나왔습니다.")

    @commands.command(name="saveplaylist")
    async def save_playlist(self, ctx: commands.Context, name: str):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        queue = self.guild_queues.get(ctx.guild.id)
        if not queue:
            await ctx.send("저장할 대기열이 없습니다.")
            return
        urls = [track["webpage_url"] for track in queue]
        playlists = self.playlists.setdefault(ctx.guild.id, {})
        playlists[name] = urls
        self.save_playlists()
        await ctx.send(f"💾 **{name}** 플레이리스트를 저장했습니다. ({len(urls)}곡)")

    @commands.command(name="loadplaylist")
    async def load_playlist(self, ctx: commands.Context, name: str):
        if not self.is_music_channel(ctx):
            await ctx.send("먼저 `!setmusicchannel` 명령어로 이 서버의 뮤직 채널을 지정해주세요.")
            return
        playlists = self.playlists.get(ctx.guild.id, {})
        urls = playlists.get(name)
        if not urls:
            await ctx.send("해당 플레이리스트가 없습니다.")
            return
        queue = self.guild_queues.setdefault(ctx.guild.id, [])
        for url in urls:
            info = await self.extract_info(url)
            info["requester"] = ctx.author
            queue.append(info)
        await ctx.send(f"▶️ **{name}** 플레이리스트를 불러왔습니다. ({len(urls)}곡)")
        voice_client = self.voice_clients.get(ctx.guild.id)
        if not voice_client or not voice_client.is_connected():
            if not ctx.author.voice or not ctx.author.voice.channel:
                await ctx.send("음성 채널에 먼저 참여해주세요.")
                return
            voice_client = await ctx.author.voice.channel.connect()
            self.voice_clients[ctx.guild.id] = voice_client
        if not voice_client.is_playing() and not voice_client.is_paused():
            await self.play_next(ctx.guild.id)

    @commands.command(name="listplaylists")
    async def list_playlists(self, ctx: commands.Context):
        playlists = self.playlists.get(ctx.guild.id, {})
        if not playlists:
            await ctx.send("저장된 플레이리스트가 없습니다.")
            return
        desc = "\n".join(f"• {name} ({len(urls)}곡)" for name, urls in playlists.items())
        embed = Embed(title="🎵 저장된 플레이리스트", description=desc, colour=Colour.blue())
        await ctx.send(embed=embed)

    @commands.command(name="deleteplaylist")
    async def delete_playlist(self, ctx: commands.Context, name: str):
        playlists = self.playlists.get(ctx.guild.id, {})
        if name not in playlists:
            await ctx.send("해당 플레이리스트가 없습니다.")
            return
        playlists.pop(name)
        self.save_playlists()
        await ctx.send(f"🗑️ **{name}** 플레이리스트를 삭제했습니다.")

    # ================================
    # 이벤트 리스너
    # ================================

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        guild_id = message.guild.id
        channel_id = self.music_channel_per_guild.get(guild_id)
        if channel_id is None or message.channel.id != channel_id:
            return

        # 사용자가 입력한 경우 이전 임베드 삭제 예약
        await self.cleanup_now_playing(guild_id)

        ctx = await self.bot.get_context(message)
        if ctx.command is None:
            await ctx.invoke(self.play, search=message.content)
        await self.bot.process_commands(message)
