require("dotenv").config();
const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Missing BOT_TOKEN. Set it in your environment before running.");
  process.exit(1);
}

const bot = new Telegraf(token);

const dataDir = path.join(__dirname, "data");
const todoPath = path.join(dataDir, "todos.json");
const reminders = new Map();

const ensureDataFiles = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(todoPath)) {
    fs.writeFileSync(todoPath, JSON.stringify({}, null, 2));
  }
};

const loadTodos = () => {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(todoPath, "utf8"));
  } catch (error) {
    console.error("Failed to read todos:", error);
    return {};
  }
};

const saveTodos = (todos) => {
  ensureDataFiles();
  fs.writeFileSync(todoPath, JSON.stringify(todos, null, 2));
};

const helpText = [
  "Xin chao! Toi la bot nhieu chuc nang.",
  "",
  "Lenh co ban:",
  "/start - Bat dau",
  "/help - Hien thi tro giup",
  "/ping - Kiem tra hoat dong",
  "/dice - Tung xuc xac",
  "",
  "Nhac viec:",
  "/remind <phut> <noi_dung> - Nhac viec sau N phut",
  "",
  "To-do:",
  "/todo add <noi_dung> - Them viec",
  "/todo list - Danh sach viec",
  "/todo done <so> - Hoan thanh viec",
  "/todo clear - Xoa danh sach",
  "",
  "Thoi tiet:",
  "/weather <thanh_pho> - Tra cuu thoi tiet",
  "",
  "Dich:",
  "/translate <lang> <noi_dung> - Dich sang ngon ngu (vi, en, ja, ...)",
  "",
  "Quan tri nhom:",
  "/ban <user_id> - Cam thanh vien",
  "/kick <user_id> - Kick thanh vien",
  "/promote <user_id> - Nhan quyen admin",
].join("\n");

const isGroupChat = (ctx) =>
  ["group", "supergroup"].includes(ctx.chat?.type);

const getUserIdFromText = (text) => {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const userId = Number(parts[1]);
  return Number.isFinite(userId) ? userId : null;
};

bot.start((ctx) => ctx.reply(helpText));
bot.command("help", (ctx) => ctx.reply(helpText));

bot.command("ping", (ctx) => ctx.reply("Pong!"));

bot.command("dice", (ctx) => {
  const roll = Math.floor(Math.random() * 6) + 1;
  ctx.reply(`Ban tung duoc: ${roll}`);
});

bot.command("remind", (ctx) => {
  const text = ctx.message?.text || "";
  const [, minutesText, ...rest] = text.trim().split(/\s+/);
  const minutes = Number(minutesText);
  const message = rest.join(" ").trim();

  if (!Number.isFinite(minutes) || minutes <= 0 || !message) {
    ctx.reply("Cu phap: /remind <phut> <noi_dung>");
    return;
  }

  const ms = minutes * 60 * 1000;
  const timer = setTimeout(() => {
    ctx.reply(`Nhac viec: ${message}`);
    reminders.delete(timer);
  }, ms);
  reminders.set(timer, { chatId: ctx.chat?.id, message });
  ctx.reply(`Da dat nhac sau ${minutes} phut.`);
});

bot.command("todo", (ctx) => {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/);
  const action = parts[1];
  const chatId = String(ctx.chat?.id || "");
  const todos = loadTodos();
  const list = todos[chatId] || [];

  if (action === "add") {
    const item = parts.slice(2).join(" ").trim();
    if (!item) {
      ctx.reply("Cu phap: /todo add <noi_dung>");
      return;
    }
    list.push({ text: item, done: false });
    todos[chatId] = list;
    saveTodos(todos);
    ctx.reply(`Da them: ${item}`);
    return;
  }

  if (action === "list") {
    if (list.length === 0) {
      ctx.reply("Chua co viec nao.");
      return;
    }
    const lines = list.map(
      (item, index) => `${index + 1}. ${item.done ? "[x]" : "[ ]"} ${item.text}`,
    );
    ctx.reply(lines.join("\n"));
    return;
  }

  if (action === "done") {
    const index = Number(parts[2]) - 1;
    if (!Number.isFinite(index) || index < 0 || index >= list.length) {
      ctx.reply("Cu phap: /todo done <so>");
      return;
    }
    list[index].done = true;
    todos[chatId] = list;
    saveTodos(todos);
    ctx.reply(`Da hoan thanh: ${list[index].text}`);
    return;
  }

  if (action === "clear") {
    todos[chatId] = [];
    saveTodos(todos);
    ctx.reply("Da xoa danh sach.");
    return;
  }

  ctx.reply("Cu phap: /todo add|list|done|clear");
});

bot.command("weather", async (ctx) => {
  const text = ctx.message?.text || "";
  const city = text.replace(/^\/weather\s*/i, "").trim();
  const geocodingUrl =
    process.env.OPENMETEO_GEOCODING_URL ||
    "https://geocoding-api.open-meteo.com/v1/search";
  const forecastUrl =
    process.env.OPENMETEO_FORECAST_URL || "https://api.open-meteo.com/v1/forecast";

  if (!city) {
    ctx.reply("Cu phap: /weather <thanh_pho>");
    return;
  }

  try {
    const geoResponse = await fetch(
      `${geocodingUrl}?name=${encodeURIComponent(city)}&count=1&language=vi&format=json`,
    );
    if (!geoResponse.ok) {
      ctx.reply("Loi tra cuu dia danh.");
      return;
    }
    const geoData = await geoResponse.json();
    const place = geoData?.results?.[0];
    if (!place) {
      ctx.reply("Khong tim thay thanh pho.");
      return;
    }

    const forecastResponse = await fetch(
      `${forecastUrl}?latitude=${place.latitude}&longitude=${place.longitude}` +
        "&current_weather=true&timezone=auto",
    );
    if (!forecastResponse.ok) {
      ctx.reply("Loi tra cuu thoi tiet.");
      return;
    }
    const forecastData = await forecastResponse.json();
    const current = forecastData?.current_weather;
    if (!current) {
      ctx.reply("Khong co du lieu thoi tiet.");
      return;
    }
    const locationLabel = [place.name, place.admin1, place.country]
      .filter(Boolean)
      .join(", ");
    ctx.reply(
      `Thoi tiet ${locationLabel}: ${current.temperature}C, gio ${current.windspeed} km/h.`,
    );
  } catch (error) {
    console.error("Weather error:", error);
    ctx.reply("Loi tra cuu thoi tiet.");
  }
});

bot.command("translate", async (ctx) => {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/);
  const target = parts[1];
  const content = parts.slice(2).join(" ").trim();
  const endpoint = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";

  if (!target || !content) {
    ctx.reply("Cu phap: /translate <lang> <noi_dung>");
    return;
  }

  try {
    const response = await fetch(`${endpoint}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: content, source: "auto", target, format: "text" }),
    });
    if (!response.ok) {
      ctx.reply("Loi dich.");
      return;
    }
    const data = await response.json();
    ctx.reply(data.translatedText || "Khong co ket qua.");
  } catch (error) {
    console.error("Translate error:", error);
    ctx.reply("Loi dich.");
  }
});

bot.command("ban", async (ctx) => {
  if (!isGroupChat(ctx)) {
    ctx.reply("Lenh nay chi dung trong nhom.");
    return;
  }
  const userId = getUserIdFromText(ctx.message?.text || "");
  if (!userId) {
    ctx.reply("Cu phap: /ban <user_id>");
    return;
  }
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, userId);
    ctx.reply(`Da cam user ${userId}.`);
  } catch (error) {
    console.error("Ban error:", error);
    ctx.reply("Khong the cam. Kiem tra quyen admin cua bot.");
  }
});

bot.command("kick", async (ctx) => {
  if (!isGroupChat(ctx)) {
    ctx.reply("Lenh nay chi dung trong nhom.");
    return;
  }
  const userId = getUserIdFromText(ctx.message?.text || "");
  if (!userId) {
    ctx.reply("Cu phap: /kick <user_id>");
    return;
  }
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, userId);
    await ctx.telegram.unbanChatMember(ctx.chat.id, userId);
    ctx.reply(`Da kick user ${userId}.`);
  } catch (error) {
    console.error("Kick error:", error);
    ctx.reply("Khong the kick. Kiem tra quyen admin cua bot.");
  }
});

bot.command("promote", async (ctx) => {
  if (!isGroupChat(ctx)) {
    ctx.reply("Lenh nay chi dung trong nhom.");
    return;
  }
  const userId = getUserIdFromText(ctx.message?.text || "");
  if (!userId) {
    ctx.reply("Cu phap: /promote <user_id>");
    return;
  }
  try {
    await ctx.telegram.promoteChatMember(ctx.chat.id, userId, {
      can_manage_chat: true,
      can_delete_messages: true,
      can_manage_video_chats: true,
      can_restrict_members: true,
      can_promote_members: false,
      can_change_info: false,
      can_invite_users: true,
      can_pin_messages: true,
    });
    ctx.reply(`Da promote user ${userId}.`);
  } catch (error) {
    console.error("Promote error:", error);
    ctx.reply("Khong the promote. Kiem tra quyen admin cua bot.");
  }
});

bot.launch().then(() => {
  console.log("Bot is running...");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
