import os
import json
from datetime import datetime
import discord
from discord.ext import commands
from discord import app_commands

DATA_FILE = os.path.join("data", "economy.json")

def _ensure_data_file():
    folder = os.path.dirname(DATA_FILE)
    if not os.path.isdir(folder):
        os.makedirs(folder, exist_ok=True)
    if not os.path.isfile(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, ensure_ascii=False, indent=4)

def _load_data() -> dict:
    _ensure_data_file()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_data(data: dict):
    _ensure_data_file()
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

class Economy(commands.Cog):
    """
    • /잔고, /출석 명령어
    • 신규 유저 자동 1000코인 지급, 매일 출석 시 100코인 추가
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_balance(self, guild_id: int, user_id: int) -> int:
        data = _load_data()
        g, u = str(guild_id), str(user_id)
        try:
            return data[g][u]["balance"]
        except KeyError:
            # 신규 사용자: 기본 1000코인 지급
            return self.change_balance(guild_id, user_id, 1000)

    def change_balance(self, guild_id: int, user_id: int, amount: int) -> int:
        data = _load_data()
        g, u = str(guild_id), str(user_id)
        data.setdefault(g, {}).setdefault(u, {"balance": 0, "last_checkin": None})

        new_bal = data[g][u]["balance"] + amount
        if new_bal < 0:
            return data[g][u]["balance"]

        data[g][u]["balance"] = new_bal
        _save_data(data)
        return new_bal

    def can_checkin(self, guild_id: int, user_id: int) -> bool:
        data = _load_data()
        g, u = str(guild_id), str(user_id)
        today = datetime.utcnow().date().isoformat()
        try:
            return data[g][u]["last_checkin"] != today
        except KeyError:
            return True

    def do_checkin(self, guild_id: int, user_id: int, amount: int = 100) -> int:
        data = _load_data()
        g, u = str(guild_id), str(user_id)
        today = datetime.utcnow().date().isoformat()
        data.setdefault(g, {}).setdefault(u, {"balance": 0, "last_checkin": None})

        if data[g][u]["last_checkin"] == today:
            return data[g][u]["balance"]

        data[g][u]["last_checkin"] = today
        data[g][u]["balance"] += amount
        _save_data(data)
        return data[g][u]["balance"]

    @commands.command(name="잔고", help="현재 코인 잔고를 조회합니다.")
    async def balance_prefix(self, ctx: commands.Context):
        bal = self.get_balance(ctx.guild.id, ctx.author.id)
        await ctx.send(f"💰 현재 잔고: {bal} 코인")

    @commands.command(name="출석", help="오늘 출석체크를 해서 100코인을 받습니다. (하루 1회)")
    async def checkin_prefix(self, ctx: commands.Context):
        if not self.can_checkin(ctx.guild.id, ctx.author.id):
            await ctx.send("🚫 이미 오늘 출석체크를 완료하셨습니다!", delete_after=10)
            return
        new_bal = self.do_checkin(ctx.guild.id, ctx.author.id, 100)
        await ctx.send(f"✅ 출석체크 완료! 100코인을 받았습니다.\n💰 현재 잔고: {new_bal} 코인")

    @app_commands.command(name="잔고", description="현재 코인 잔고를 조회합니다.")
    async def balance_slash(self, interaction: discord.Interaction):
        bal = self.get_balance(interaction.guild.id, interaction.user.id)
        await interaction.response.send_message(f"💰 현재 잔고: {bal} 코인", ephemeral=True)

    @app_commands.command(name="출석", description="오늘 출석체크를 해서 100코인을 받습니다.")
    async def checkin_slash(self, interaction: discord.Interaction):
        if not self.can_checkin(interaction.guild.id, interaction.user.id):
            await interaction.response.send_message("🚫 이미 오늘 출석체크를 완료하셨습니다!", ephemeral=True)
            return
        new_bal = self.do_checkin(interaction.guild.id, interaction.user.id, 100)
        await interaction.response.send_message(f"✅ 출석체크 완료! 100코인을 받았습니다.\n💰 현재 잔고: {new_bal} 코인", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(Economy(bot))
