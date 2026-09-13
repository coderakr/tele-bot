import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Bot, InputFile } from "grammy";

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error("BOT_TOKEN is not defined");
}

const bot = new Bot(token);

// =========================
// Rate Limiter
// =========================

const WINDOW_MS = 10_000; // 10 seconds
const MAX_REQUESTS = 5;

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const rateLimits = new Map<number, RateLimitEntry>();

bot.use(async (ctx, next) => {
    // Only rate-limit users
    if (!ctx.from) {
        return next();
    }

    const userId = ctx.from.id;
    const now = Date.now();

    const entry = rateLimits.get(userId);

    // First request or previous window expired
    if (!entry || now >= entry.resetAt) {
        rateLimits.set(userId, {
            count: 1,
            resetAt: now + WINDOW_MS,
        });

        return next();
    }

    // Rate limit exceeded
    if (entry.count >= MAX_REQUESTS) {
        const remainingSeconds = Math.ceil(
            (entry.resetAt - now) / 1000
        );

        await ctx.reply(
            `Too many requests. Please try again in ${remainingSeconds}s.`
        );

        return;
    }

    // Increment request count
    entry.count++;

    return next();
});

// =========================
// Commands
// =========================

bot.command("start", async (ctx) => {
    await ctx.reply("Hello! 👋 I'm your Telegram bot.");
});

bot.command("id", async (ctx) => {
    await ctx.reply(`Your user ID is: ${ctx.from?.id}`);
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

// =========================
// Error Handler
// =========================

bot.catch((error) => {
    console.error("Error while handling update:", error.error);
});

bot.start();

console.log("Bot is running...");