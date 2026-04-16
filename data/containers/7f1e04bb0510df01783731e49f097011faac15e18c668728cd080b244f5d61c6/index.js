const { Telegraf } = require("telegraf");

const token = "8085774988:AAGjwmpmVIpOe9rJNptOic7yPWopUqpEfys";
if (!token) {
  console.error(
    "Missing BOT_TOKEN. Set it in your environment before running.",
  );
  process.exit(1);
}

const bot = new Telegraf(token);

const helpText = [
  "Xin chao! Toi la bot don gian.",
  "",
  "Lenh ho tro:",
  "/start - Bat dau",
  "/help - Hien thi tro giup",
].join("\n");

bot.start((ctx) => ctx.reply(helpText));
bot.command("help", (ctx) => ctx.reply(helpText));

bot.launch().then(() => {
  console.log("Bot is running...");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
