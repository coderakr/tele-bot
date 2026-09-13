import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Bot, InputFile } from "grammy";

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error("BOT_TOKEN is not defined");
}

const bot = new Bot(token);

bot.command("start", async (ctx) => {
    await ctx.reply("Hello! 👋 I'm your Telegram bot.");
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        "Available commands:\n/start - Start the bot\n/help - Show help"
    );
});

bot.command("hello", async (ctx) => {
    await ctx.reply("hii from ak");
});

bot.command("image", async (ctx) => {
    const image = await readFile(
        new URL("./image.png", import.meta.url)
    );

    await ctx.replyWithPhoto(
        new InputFile(image, "image.png")
    );
});

bot.on("message:text", async (ctx) => {
    await ctx.reply(`You said: ${ctx.message.text}`);
});

bot.catch((error) => {
    console.error("Error while handling update:", error.error);
});

bot.start();

console.log("Bot is running...");