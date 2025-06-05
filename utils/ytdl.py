# utils/ytdl.py

import asyncio
import discord
import yt_dlp

# ──────────────────────────────────────────────────────────────────────────────
# yt-dlp 포맷 옵션 (검색이나 재생목록/단일_VIDEO 정보 추출용)
# ──────────────────────────────────────────────────────────────────────────────
ytdl_format_options = {
    'format': 'bestaudio/best',
    'quiet': True,
    'ignoreerrors': True,
    'noplaylist': False,        # 재생목록인 경우 entries 반환
    'extract_flat': False       # 실제 메타데이터+스트림 URL까지 얻음
}
ytdl = yt_dlp.YoutubeDL(ytdl_format_options)

# ──────────────────────────────────────────────────────────────────────────────
# FFmpeg 옵션 (디스코드 내부 재생용)
# ──────────────────────────────────────────────────────────────────────────────
ffmpeg_options = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn'
}


class YTDLSource(discord.PCMVolumeTransformer):
    """
    • from_url(cls, url, loop=..., stream=True/False) 로 사용
    • stream=True  면 스트림 전용 URL만 얻어서 FFmpegPCMAudio로 재생
    • stream=False 면 yt-dlp가 파일로 다운로드하거나 캐싱 후 재생
    """

    def __init__(self, source, *, data, volume: float = 0.5):
        super().__init__(source, volume)
        self.data = data
        self.title = data.get('title')
        self.url = data.get('webpage_url')

    @classmethod
    async def from_url(cls, url: str, *, loop=None, stream: bool = False):
        """
        • url: YouTube 동영상/재생목록 URL or 검색 URL(ytsearch 형태)
        • stream: True면 다운로드 없이 스트림용 URL만 추출
        """
        loop = loop or asyncio.get_event_loop()

        # 1) yt-dlp로 정보 추출 (download=False 이면 stream용 URL만 얻음)
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=not stream))

        if data is None:
            raise ValueError("yt-dlp로부터 정보 추출 실패")

        # 2) 재생목록(entry list)인 경우, 첫 번째 비디오만 사용
        if 'entries' in data:
            # entries: [video1, video2, ...]
            data = data['entries'][0]
            if data is None:
                raise ValueError("유효한 비디오 정보를 얻을 수 없습니다.")

        # 3) 재생에 사용할 실제 “stream_url” 또는 “filepath” 결정
        if stream:
            # WAV/Opus 스트림용 URL (data['url'] 값)
            filename = data['url']
        else:
            # 다운로드한 파일 경로
            filename = ytdl.prepare_filename(data)

        return cls(discord.FFmpegPCMAudio(filename, **ffmpeg_options), data=data)
