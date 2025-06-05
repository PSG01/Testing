# bot.py

import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"{bot.user} 연결됨")

# Music Cog 등록
from cogs.music import Music
bot.add_cog(Music(bot))

bot.run(DISCORD_TOKEN)
