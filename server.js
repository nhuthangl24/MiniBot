const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const Docker = require("dockerode");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const docker = new Docker();

function shouldUseTelegramPolling() {
  return process.env.TELEGRAM_USE_POLLING === "true";
}

async function postTelegramUpdateToApp(update) {
  await fetch("http://127.0.0.1:3000/api/telegram/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
}

function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !shouldUseTelegramPolling()) return;

  let offset = 0;
  let stopped = false;

  const deleteWebhook = async () => {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: false }),
      });
    } catch (error) {
      console.error("[telegram-polling] deleteWebhook failed:", error.message);
    }
  };

  const poll = async () => {
    while (!stopped) {
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${token}/getUpdates?timeout=25&allowed_updates=${encodeURIComponent(
            JSON.stringify(["callback_query"]),
          )}&offset=${offset}`,
        );
        const data = await res.json();
        if (!data?.ok || !Array.isArray(data.result)) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        for (const update of data.result) {
          offset = Math.max(offset, (update.update_id || 0) + 1);
          if (update.callback_query) {
            await postTelegramUpdateToApp(update);
          }
        }
      } catch (error) {
        console.error("[telegram-polling] poll failed:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  };

  deleteWebhook().then(() => {
    console.log("> Telegram polling enabled for local development");
    poll();
  });

  return () => {
    stopped = true;
  };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socketio",
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    let currentContainer = null;
    let logStream = null;

    socket.on("attach", async (serverId) => {
      socket.join(serverId);
      try {
        currentContainer = docker.getContainer(serverId);
        const info = await currentContainer.inspect();
        if (info.State.Running) {
          logStream = await currentContainer.logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: 100,
          });
          
          logStream.on("data", (chunk) => {
             // Docker mux stream logic header offset is chunk.slice(8) 
             // but chunk.toString() sometimes works enough for basic terminal.
             const text = chunk.length > 8 ? chunk.slice(8).toString("utf8") : chunk.toString("utf8");
             socket.emit("console-output", text);
          });
        } else {
             socket.emit("console-output", `\r\n\x1b[31m[Quản lý]\x1b[0m Server đang tắt. Nhấn nút Bắt đầu để mở.\r\n`);
        }
      } catch (err) {
        socket.emit("console-output", `\r\n\x1b[31m[Lỗi Hệ Thống]\x1b[0m ${err.message}\r\n`);
      }
    });

    socket.on("command", async ({serverId, cmd}) => {
      try {
        const cont = docker.getContainer(serverId);
        const stream = await cont.attach({ stream: true, stdin: true, stdout: true, stderr: true });
        stream.write(cmd + "\n");
      } catch(e) {
        console.error(e);
      }
    });

    socket.on("disconnect", () => {
      if (logStream) logStream.destroy();
    });
  });

  const stopTelegramPolling = startTelegramPolling();

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Khởi động thành công server.js trên cổng 3000 với WebSockets");
  });

  process.on("SIGINT", () => {
    if (stopTelegramPolling) stopTelegramPolling();
    process.exit(0);
  });
});
