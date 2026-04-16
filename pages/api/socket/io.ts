import { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import { NextApiRequest, NextApiResponse } from "next";
import DockerService from "../../../services/docker/DockerService";
import { resolveContainerId } from "../../../services/containerResolver";
import {
  ensureHostingSourcePath,
  findHostingAccessForUser,
  getSessionUserId,
  hasHostingPermission,
} from "../../../lib/serverHosting";
import fs from "fs/promises";
import path from "path";
// Import NextAuth token reader
import { getToken } from "next-auth/jwt";

export const config = {
  api: {
    bodyParser: false,
  },
};

const secret = process.env.NEXTAUTH_SECRET || "fallback-secret";

// To hold active streams
const logsStreams: Record<string, NodeJS.ReadableStream> = {};
const statsStreams: Record<string, NodeJS.ReadableStream> = {};

async function getPathSize(targetPath: string): Promise<number> {
  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const sizes = await Promise.all(
      entries.map((entry) => getPathSize(path.join(targetPath, entry.name))),
    );
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}

async function getDeploymentDiskUsage(sourcePath?: string): Promise<number> {
  if (!sourcePath) return 0;

  const dataPath = path.join(path.dirname(sourcePath), "data");
  const [sourceSize, dataSize] = await Promise.all([
    getPathSize(sourcePath),
    getPathSize(dataPath),
  ]);

  return sourceSize + dataSize;
}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponse & { socket: any },
) {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: "/api/socket/io",
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      let currentServerId = "";
      let currentContainerId = "";
      let docker = DockerService.getInstance().getDocker();
      let currentSourcePath = "";
      let currentCanViewConsole = false;
      let currentCanCommandConsole = false;
      let diskUsageBytes = 0;
      let lastDiskCheckAt = 0;
      let diskCheckInFlight = false;

      socket.on("attach", async (serverId: string) => {
        const isAttachableId =
          typeof serverId === "string" && /^[a-f0-9]{12,}$/i.test(serverId);
        if (!isAttachableId) {
          return;
        }
        currentServerId = serverId;

        try {
          const token = await getToken({ req, secret });
          const userId = getSessionUserId(token || {});

          if (!userId) {
            socket.emit(
              "console-output",
              "[System Error] Không xác định được người dùng đăng nhập cho console.\r\n",
            );
            return;
          }
          const access = await findHostingAccessForUser(serverId, userId);

          if (!access) {
            socket.emit(
              "console-output",
              "[System Error] Bạn không có quyền truy cập server này.\r\n",
            );
            return;
          }

          currentCanViewConsole =
            access.isOwner || hasHostingPermission(access.permissions, "console:view");
          currentCanCommandConsole =
            access.isOwner || hasHostingPermission(access.permissions, "console:command");

          if (!currentCanViewConsole) {
            socket.emit(
              "console-output",
              "[System Error] Bạn không có quyền xem console.\r\n",
            );
            return;
          }

          try {
            const resolved = await resolveContainerId(serverId, userId);
            currentContainerId = resolved.containerId || "";
            currentSourcePath =
              resolved.hosting?.sourcePath ||
              (await ensureHostingSourcePath(access.hosting).catch(() => ""));
          } catch {
            try {
              currentContainerId = access.hosting.containerId || "";
              currentSourcePath = await ensureHostingSourcePath(access.hosting).catch(
                () => "",
              );
            } catch {
              console.log("socket attach failed! serverId:", serverId);
              socket.emit(
                "console-output",
                "[System Error] Container không tồn tại hoặc chưa khởi chạy.\r\n",
              );
              return;
            }
          }

          if (!currentContainerId) {
            socket.emit(
              "console-output",
              "[System Error] Container không tồn tại hoặc chưa khởi chạy.\r\n",
            );
            return;
          }

          const container = docker.getContainer(currentContainerId);
          const info = await container.inspect();
          if (!currentSourcePath) {
            const sourceMount = info?.Mounts?.find(
              (mount: { Destination?: string; Source?: string }) =>
                mount.Destination === "/home/container" && mount.Source,
            );
            currentSourcePath = sourceMount?.Source || "";
          }
          const isLive = Boolean(info?.State?.Running || info?.State?.Restarting);

          // Cleanup old streams if re-attaching
          if (logsStreams[socket.id]) {
            (logsStreams[socket.id] as any).destroy?.();
            delete logsStreams[socket.id];
          }
          if (statsStreams[socket.id]) {
            (statsStreams[socket.id] as any).destroy?.();
            delete statsStreams[socket.id];
          }

          // Stream logs
          if (isLive && !logsStreams[socket.id]) {
            try {
              const logStream = await container.logs({
                follow: true,
                stdout: true,
                stderr: true,
                tail: 100,
              });
              logsStreams[socket.id] = logStream;

              const pass = new (require("stream").PassThrough)();
              docker.modem.demuxStream(logStream, pass, pass);

              pass.on("data", (chunk: Buffer) => {
                socket.emit("console-output", chunk.toString("utf-8"));
              });
            } catch (e) {}
          }

          // Stream Stats
          if (isLive && !statsStreams[socket.id]) {
            try {
              const statsStream = await container.stats({ stream: true });
              statsStreams[socket.id] = statsStream as any;
              statsStream.on("data", async (chunk: Buffer) => {
                try {
                  const statContent = JSON.parse(chunk.toString("utf-8"));
                  const cpuDelta =
                    statContent.cpu_stats.cpu_usage.total_usage -
                    statContent.precpu_stats.cpu_usage.total_usage;
                  const systemDelta =
                    statContent.cpu_stats.system_cpu_usage -
                    statContent.precpu_stats.system_cpu_usage;
                  let cpuPct = 0.0;
                  if (systemDelta > 0 && cpuDelta > 0) {
                    cpuPct =
                      (cpuDelta / systemDelta) *
                      statContent.cpu_stats.online_cpus *
                      100.0;
                  }

                  const memUsed = statContent.memory_stats.usage || 0;
                  const memLimit = statContent.memory_stats.limit || 0;

                  const now = Date.now();
                  if (
                    currentSourcePath &&
                    !diskCheckInFlight &&
                    (diskUsageBytes === 0 || now - lastDiskCheckAt > 4000)
                  ) {
                    diskCheckInFlight = true;
                    lastDiskCheckAt = now;
                    getDeploymentDiskUsage(currentSourcePath)
                      .then((size) => {
                        diskUsageBytes = size;
                      })
                      .finally(() => {
                        diskCheckInFlight = false;
                      });
                  }

                  socket.emit("stats", {
                    cpu: cpuPct,
                    mem: memUsed / (1024 * 1024),
                    memLimit: memLimit / (1024 * 1024),
                    diskBytes: diskUsageBytes,
                  });
                } catch (e) {}
              });
            } catch (e) {}
          }

          if (!isLive) {
            socket.emit(
              "console-output",
              "[System] Container đang dừng. Không phát lại log cũ.\r\n",
            );
          }
        } catch (e) {
          socket.emit(
            "console-output",
            "[System Error] Lỗi kết nối tới Server daemon.\r\n",
          );
        }
      });

      socket.on("command", async (data: { serverId: string; cmd: string }) => {
        if (!currentContainerId) return;
        if (!currentCanCommandConsole) {
          socket.emit(
            "console-output",
            "[System Error] Bạn không có quyền gửi lệnh vào console.\r\n",
          );
          return;
        }
        try {
          const container = docker.getContainer(currentContainerId);
          // To execute command we can use exec
          const exec = await container.exec({
            Cmd: ["/bin/sh", "-c", data.cmd],
            AttachStdout: true,
            AttachStderr: true,
            WorkingDir: "/home/container",
          });
          const stream: any = await exec.start({ Detach: false } as any);
          socket.emit("console-output", `\r\n\x1b[33m$ ${data.cmd}\x1b[0m\r\n`);
          stream.on("data", (chunk: Buffer) => {
            socket.emit("console-output", chunk.toString("utf-8", 8));
          });
        } catch (e: any) {
          socket.emit("console-output", `[Exec Error] ${e.message}\r\n`);
        }
      });

      socket.on("disconnect", () => {
        if (logsStreams[socket.id]) {
          // Destroy log stream
          (logsStreams[socket.id] as any).destroy?.();
          delete logsStreams[socket.id];
        }
        if (statsStreams[socket.id]) {
          // Destroy stat stream
          (statsStreams[socket.id] as any).destroy?.();
          delete statsStreams[socket.id];
        }
      });
    });
    res.socket.server.io = io;
  }
  res.end();
}
