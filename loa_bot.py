import asyncio
import discord

client = discord.Client(intents=discord.Intents.all())
token = "MTE5MTc0ODgzNTM1ODI4MTg3OA.GfERBw.gx1QCC1sUyNfMCAb7edb44uOTpQIhSHHCc5zzo" # available on raspberry pi

@client.event
async def on_ready():
    print("Logged in as ")
    print(client.user.name)
    print(client.user.id)
    print("=============")
    await client.change_presence(activity=discord.Game(name="반가워요", type=1))

@client.event
async def on_message(message):
    if message.author.bot:
        return None

    id = message.author.id
    channel = message.channel

    if message.content.startswith("!로아봇"):
        await message.channel.send("왜불러")
    else:
        await message.channel.send("\""+message.content+"\"라고 말함.")

client.run(token)