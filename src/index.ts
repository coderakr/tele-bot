import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
            `Too many requests.Please try again in ${remainingSeconds} s.`
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
    await ctx.reply(`Your user ID is: ${ctx.from?.id} `);
});

bot.command("help", async (ctx) => {
    await ctx.reply(
        "Available commands:\n" +
        "/start - Start the bot\n" +
        "/id - Get your Telegram user ID\n" +
        "/help - Show help\n" +
        "/hello - Say hello\n" +
        "/image - Get an image"
    );
});

bot.command("hello", async (ctx) => {
    await ctx.reply("hii from ak");
});

// =========================
// Image Command
// =========================

bot.command("image", async (ctx) => {
    try {
        const imagePath = path.join(
            process.cwd(),
            "public",
            "image.png"
        );

        const image = await readFile(imagePath);

        await ctx.replyWithPhoto(
            new InputFile(image, "image.png")
        );
    } catch (error) {
        console.error("Failed to send image:", error);

        await ctx.reply(
            "Sorry, I couldn't send the image right now."
        );
    }
});

// =========================
// Text Messages
// =========================

bot.on("message:text", async (ctx) => {
    await ctx.reply(`You said: ${ctx.message.text} `);
});

// =========================
// Error Handler
// =========================

bot.catch((error) => {
    console.error(
        "Error while handling update:",
        error.error
    );
});

// =========================
// Start Bot
// =========================

const shutdown = (signal: string) => {
    console.log(`Received ${signal}, stopping bot...`);
    bot.stop();
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

bot.start().catch((error: unknown) => {
    const description =
        error && typeof error === "object" && "description" in error
            ? String(error.description)
            : String(error);

    if (description.includes("terminated by other getUpdates request")) {
        console.error(
            "Telegram polling conflict: another bot process is already using this token. " +
            "Stop the other process or use a different bot token."
        );
    } else {
        console.error("Failed to start the bot:", error);
    }

    process.exitCode = 1;
});

console.log("Bot is running...");