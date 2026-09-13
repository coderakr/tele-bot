import "dotenv/config";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Bot, InputFile, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is not defined");

const bot = new Bot(token);

// =========================
// Rate Limiter
// =========================

const WINDOW_MS = 10_000;
const MAX_REQUESTS = 5;

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

const rateLimits = new Map<number, RateLimitEntry>();

bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    const userId = ctx.from.id;
    const now = Date.now();
    const entry = rateLimits.get(userId);

    if (!entry || now >= entry.resetAt) {
        rateLimits.set(userId, {
            count: 1,
            resetAt: now + WINDOW_MS,
        });
        return next();
    }

    if (entry.count >= MAX_REQUESTS) {
        const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
        await ctx.reply(`Too many requests. Please try again in ${remainingSeconds} s.`);
        return;
    }

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
        const imagePath = path.join(process.cwd(), "public", "image.png");
        const image = await readFile(imagePath);
        await ctx.replyWithPhoto(new InputFile(image, "image.png"));
    } catch (error) {
        console.error("Failed to send image:", error);
        await ctx.reply("Sorry, I couldn't send the image right now.");
    }
});

// =========================
// Text Messages
// =========================

bot.on("message:text", async (ctx) => {
    await ctx.reply(`You said: ${ctx.message.text}`);
});

// =========================
// Error Handler
// =========================

bot.catch((error) => {
    console.error("Error while handling update:", error.error);
});

// =========================
// Webhook & HTTP Server
// =========================

const handleUpdate = webhookCallback(bot, "http");

const server = http.createServer(async (req, res) => {
    // Basic health-check endpoint for Render
    if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        return res.end("Bot is healthy and running!");
    }

    // Telegram webhook handler
    return handleUpdate(req, res);
});

const PORT = Number(process.env.PORT) || 3000;

server.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);

    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
        try {
            await bot.api.setWebhook(`${renderUrl}/`);
            console.log(`Webhook set successfully to ${renderUrl}`);
        } catch (err) {
            console.error("Failed to register webhook with Telegram:", err);
        }
    }
});

// Graceful Shutdown
const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down HTTP server...`);
    server.close(() => {
        console.log("Server stopped.");
        process.exit(0);
    });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));