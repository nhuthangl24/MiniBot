"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { PLAN_CONFIG } from "@/lib/planConfig";

type Status = "running" | "offline" | "starting";

type LogLine = { text: string; level: string };

type StatHistory = {
  cpu: number[];
  mem: number[];
  disk: number[];
};

type ConsoleSnapshot = {
  status: Status;
  botName: string;
  permissions: string[];
  isOwner: boolean;
  logs: LogLine[];
  planLimits: {
    memLimit: number;
    diskLimit: number;
    cpuLimit: number;
  };
  stats: {
    cpu: number;
    mem: number;
    diskBytes: number;
    netIn: number;
    netOut: number;
  };
  statHistory: StatHistory;
  socketAttachedId: string | null;
};

type ConsoleRuntime = {
  snapshot: ConsoleSnapshot;
  socket: Socket | null;
  initialized: boolean;
  attachedServerId: string | null;
  subscribers: Set<(snapshot: ConsoleSnapshot) => void>;
};

function createDefaultSnapshot(): ConsoleSnapshot {
  return {
    status: "offline",
    botName: "My Bot",
    permissions: [],
    isOwner: false,
    logs: [],
    planLimits: {
      memLimit: 1024,
      diskLimit: 1.0,
      cpuLimit: 100.0,
    },
    stats: {
      cpu: 0,
      mem: 0,
      diskBytes: 0,
      netIn: 0,
      netOut: 0,
    },
    statHistory: {
      cpu: Array(20).fill(0),
      mem: Array(20).fill(0),
      disk: Array(20).fill(0),
    },
    socketAttachedId: null,
  };
}

const consoleRuntimes = new Map<string, ConsoleRuntime>();

function getConsoleRuntime(serverId: string) {
  let runtime = consoleRuntimes.get(serverId);
  if (!runtime) {
    runtime = {
      snapshot: createDefaultSnapshot(),
      socket: null,
      initialized: false,
      attachedServerId: null,
      subscribers: new Set(),
    };
    consoleRuntimes.set(serverId, runtime);
  }
  return runtime;
}

function persistConsoleSnapshot(serverId: string, snapshot: ConsoleSnapshot) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `minibot:console:${serverId}`,
    JSON.stringify(snapshot),
  );
}

function broadcastConsoleSnapshot(serverId: string) {
  const runtime = getConsoleRuntime(serverId);
  persistConsoleSnapshot(serverId, runtime.snapshot);
  runtime.subscribers.forEach((subscriber) => subscriber(runtime.snapshot));
}

function patchConsoleSnapshot(
  serverId: string,
  updater: (snapshot: ConsoleSnapshot) => ConsoleSnapshot,
) {
  const runtime = getConsoleRuntime(serverId);
  runtime.snapshot = updater(runtime.snapshot);
  broadcastConsoleSnapshot(serverId);
}

export default function ConsolePage() {
  const params = useParams<{ id: string }>();
  const serverId = params?.id as string;
  const runtimeSnapshot = serverId
    ? getConsoleRuntime(serverId).snapshot
    : createDefaultSnapshot();
  const isAttachableId = (id?: string | null) =>
    typeof id === "string" && /^[a-f0-9]{12,}$/i.test(id);

  const [status, setStatus] = useState<Status>(runtimeSnapshot.status);
  const [botName, setBotName] = useState(runtimeSnapshot.botName);
  const [permissions, setPermissions] = useState<string[]>(
    runtimeSnapshot.permissions,
  );
  const [isOwner, setIsOwner] = useState<boolean>(runtimeSnapshot.isOwner);
  const [logs, setLogs] = useState<LogLine[]>(runtimeSnapshot.logs);
  const [cmd, setCmd] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState(runtimeSnapshot.planLimits);
  const [stats, setStats] = useState(runtimeSnapshot.stats);
  const [statHistory, setStatHistory] = useState<StatHistory>(
    runtimeSnapshot.statHistory,
  );

  const termRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [socketAttachedId, setSocketAttachedId] = useState<string | null>(
    runtimeSnapshot.socketAttachedId,
  );

  const formatBytes = (value: number) => {
    if (!value) return "0 B";

    const units = ["B", "KiB", "MiB", "GiB", "TiB"];
    let size = value;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    const precision = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  };

  useEffect(() => {
    if (!serverId) return;

    const runtime = getConsoleRuntime(serverId);
    const syncFromRuntime = (snapshot: ConsoleSnapshot) => {
      setStatus(snapshot.status);
      setBotName(snapshot.botName);
      setPermissions(snapshot.permissions);
      setIsOwner(snapshot.isOwner);
      setLogs(snapshot.logs);
      setPlanLimits(snapshot.planLimits);
      setStats(snapshot.stats);
      setStatHistory(snapshot.statHistory);
      setSocketAttachedId(snapshot.socketAttachedId);
    };

    runtime.subscribers.add(syncFromRuntime);
    syncFromRuntime(runtime.snapshot);

    try {
      const cached = sessionStorage.getItem(`minibot:console:${serverId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as ConsoleSnapshot | LogLine[];
        if (Array.isArray(parsed)) {
          patchConsoleSnapshot(serverId, (snapshot) => ({
            ...snapshot,
            logs: parsed,
          }));
        } else if (parsed && typeof parsed === "object") {
          patchConsoleSnapshot(serverId, (snapshot) => ({
            ...snapshot,
            status: parsed.status || snapshot.status,
            botName: parsed.botName || snapshot.botName,
            permissions: Array.isArray(parsed.permissions)
              ? parsed.permissions
              : snapshot.permissions,
            isOwner:
              typeof parsed.isOwner === "boolean"
                ? parsed.isOwner
                : snapshot.isOwner,
            logs: Array.isArray(parsed.logs) ? parsed.logs : snapshot.logs,
            planLimits: parsed.planLimits || snapshot.planLimits,
            stats: parsed.stats || snapshot.stats,
            statHistory: parsed.statHistory || snapshot.statHistory,
            socketAttachedId:
              "socketAttachedId" in parsed
                ? parsed.socketAttachedId
                : snapshot.socketAttachedId,
          }));
        }
      }
    } catch {}

    return () => {
      runtime.subscribers.delete(syncFromRuntime);
    };
  }, [serverId]);

  const addLog = (text: string) => {
    if (!serverId) return;
    const lower = text.toLowerCase();
    let level = "normal";
    if (
      lower.includes("error") ||
      lower.includes("err") ||
      lower.includes("fatal")
    ) {
      level = "error";
    } else if (lower.includes("warn")) {
      level = "warn";
    } else if (lower.includes("[system]") || lower.includes("powered by")) {
      level = "system";
    } else if (
      lower.includes("ready") ||
      lower.includes("success") ||
      lower.includes("online")
    ) {
      level = "success";
    }

    patchConsoleSnapshot(serverId, (snapshot) => {
      const prev = snapshot.logs;
      let isClear = false;
      let processedText = text;

      if (
        processedText.includes("\x1b[H\x1b[J") ||
        processedText.includes("\x1b[2J") ||
        processedText.includes("\x1b[H\x1b[2J")
      ) {
        isClear = true;
        const parts = processedText.split(
          /\x1b\[H\x1b\[J|\x1b\[2J|\x1b\[H\x1b\[2J/,
        );
        processedText = parts[parts.length - 1];
      }

      const cleanText = processedText
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
        .replace(/\r/g, "");
      const newLogs = isClear ? [] : prev;
      if (!cleanText && !cleanText.trim() && isClear) {
        return { ...snapshot, logs: newLogs };
      }
      if (!cleanText) {
        return { ...snapshot, logs: newLogs };
      }

      const hostName = (serverId || "server")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 12);
      const prompt = `${hostName || "server"}@minibot:~$`;

      const lines = cleanText
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .flatMap((line) => {
          if (/^>\s*node\s+index\.js$/i.test(line)) {
            return [`${prompt} node index.js`];
          }
          if (/^>\s*/.test(line)) {
            return [`${prompt} ${line.replace(/^>\s*/, "")}`];
          }
          return [line];
        });

      if (lines.length === 0) {
        return { ...snapshot, logs: newLogs };
      }

      const appended = lines.map((line) => ({ text: line, level }));
      return {
        ...snapshot,
        logs: [...newLogs.slice(-599), ...appended],
      };
    });

    setTimeout(() => {
      if (termRef.current)
        termRef.current.scrollTop = termRef.current.scrollHeight;
    }, 50);
  };

  useEffect(() => {
    if (!serverId) return;
    let cancelled = false;
    const runtime = getConsoleRuntime(serverId);

    if (runtime.socket) {
      socketRef.current = runtime.socket;
    }

    if (runtime.initialized) {
      return () => {
        cancelled = true;
      };
    }

    runtime.initialized = true;

    fetch(`/api/servers/${serverId}/status`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        patchConsoleSnapshot(serverId, (snapshot) => ({
          ...snapshot,
          status:
            d.status === "running"
              ? "running"
              : d.status === "starting"
                ? "starting"
                : "offline",
        }));
      })
      .catch(() => {});

    fetch(`/api/servers/${serverId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || d?.error) return;
        patchConsoleSnapshot(serverId, (snapshot) => ({
          ...snapshot,
          botName: d.botName || "My Bot",
          permissions: Array.isArray(d.permissions)
            ? d.permissions
            : snapshot.permissions,
          isOwner: Boolean(d.isOwner),
          socketAttachedId: d.containerId || null,
        }));
      })
      .catch(() => {});

    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const matchedHosting = [
          d.hosting,
          ...(Array.isArray(d.sharedHostings) ? d.sharedHostings : []),
        ]
          .filter(Boolean)
          .find(
            (item: any) =>
              item?._id === serverId ||
              item?.containerId === serverId ||
              item?.deploymentId === serverId,
          );
        if (cancelled || !matchedHosting) return;
        const plan =
          PLAN_CONFIG[
            (matchedHosting.planId || "free") as keyof typeof PLAN_CONFIG
          ] || PLAN_CONFIG.free;
        const mL = plan.ramMb;
        const cL = plan.cpuCores * 100;
        const dL = plan.diskGb;
        patchConsoleSnapshot(serverId, (snapshot) => ({
          ...snapshot,
          permissions: Array.isArray(matchedHosting.sharedAccess?.permissions)
            ? matchedHosting.sharedAccess.permissions
            : snapshot.permissions,
          isOwner: !matchedHosting.isShared,
          planLimits: { memLimit: mL, cpuLimit: cL, diskLimit: dL },
        }));
      })
      .catch(() => {});

    const socket = io({ path: "/api/socket/io" });
    socketRef.current = socket;
    runtime.socket = socket;

    socket.on("connect", () => {
      if (runtime.attachedServerId !== serverId) {
        addLog("[System] Connected to console daemon.");
      }
      patchConsoleSnapshot(serverId, (snapshot) => ({
        ...snapshot,
        status: snapshot.status === "offline" ? "starting" : snapshot.status,
      }));
      if (isAttachableId(serverId) && runtime.attachedServerId !== serverId) {
        socket.emit("attach", serverId);
        runtime.attachedServerId = serverId;
      }
    });

    socket.on("console-output", (data: string) => {
      addLog(data);
      const lower = data.toLowerCase();
      if (
        lower.includes("bot is running") ||
        lower.includes("connected to console daemon") ||
        lower.includes('action "start" executed successfully') ||
        lower.includes('action "restart" executed successfully')
      ) {
        patchConsoleSnapshot(serverId, (snapshot) => ({
          ...snapshot,
          status: "running",
        }));
      } else if (lower.includes("container đang dừng")) {
        patchConsoleSnapshot(serverId, (snapshot) => ({
          ...snapshot,
          status: "offline",
        }));
      }
    });
    socket.on("disconnect", () => {
      addLog("[System] Disconnected.");
      patchConsoleSnapshot(serverId, (snapshot) => ({
        ...snapshot,
        status: "offline",
      }));
    });
    socket.on("stats", (data: any) => {
      patchConsoleSnapshot(serverId, (snapshot) => {
        const prev = snapshot.planLimits;
        const ml =
          data.memLimit > 0 ? Math.round(data.memLimit) : prev.memLimit;
        const memP = ml > 0 ? (data.mem / ml) * 100 : 0;
        const diskGiB = (data.diskBytes || 0) / (1024 * 1024 * 1024);
        const diskP = prev.diskLimit > 0 ? (diskGiB / prev.diskLimit) * 100 : 0;
        return {
          ...snapshot,
          status: "running",
          planLimits: { ...prev, memLimit: ml },
          stats: {
            ...snapshot.stats,
            cpu: data.cpu,
            mem: data.mem,
            diskBytes: data.diskBytes || 0,
          },
          statHistory: {
            cpu: [
              ...snapshot.statHistory.cpu.slice(1),
              Math.min(data.cpu, prev.cpuLimit),
            ],
            mem: [...snapshot.statHistory.mem.slice(1), Math.min(memP, 100)],
            disk: [...snapshot.statHistory.disk.slice(1), Math.min(diskP, 100)],
          },
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const doAction = async (action: "start" | "stop" | "restart") => {
    if (serverId && (action === "start" || action === "restart")) {
      patchConsoleSnapshot(serverId, (snapshot) => ({
        ...snapshot,
        logs: [],
      }));
    }
    setActionLoading(action);
    try {
      const res = await fetch(`/api/servers/${serverId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        if (serverId) {
          patchConsoleSnapshot(serverId, (snapshot) => ({
            ...snapshot,
            socketAttachedId: data.containerId || snapshot.socketAttachedId,
            status: action === "stop" ? "offline" : "running",
          }));
        }

        addLog(`[System] Action "${action}" executed successfully.`);
        if (action === "start" || action === "restart") {
          setTimeout(() => {
            const attachId = data.containerId || socketAttachedId || serverId;
            if (socketRef.current && isAttachableId(attachId)) {
              socketRef.current.emit("attach", attachId);
            }
          }, 1000);
        }
      } else {
        const err = await res.json();
        addLog(`[Error] ${err.error}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      addLog(`[Error] ${message}`);
    }
    setActionLoading(null);
  };

  const sendCommand = () => {
    if (!cmd.trim()) return;
    addLog(`$ ${cmd}`);
    const attachId = socketAttachedId || serverId;
    if (isAttachableId(attachId)) {
      socketRef.current?.emit("command", { serverId: attachId, cmd });
    } else {
      addLog("[System Error] Container chưa sẵn sàng để nhận lệnh.");
    }
    setCmd("");
  };

  const levelClass = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-yellow-400";
      case "system":
        return "text-cyan-400";
      case "success":
        return "text-green-400";
      default:
        return "text-[#9eb3cc]";
    }
  };

  const statusLabel = {
    running: "Online",
    offline: "Offline",
    starting: "Starting...",
  }[status];
  const statusColor = {
    running: "text-green-400",
    offline: "text-red-400",
    starting: "text-yellow-400",
  }[status];
  const cpuPct = Math.min(stats.cpu, planLimits.cpuLimit);
  const memPct =
    planLimits.memLimit > 0
      ? Math.round((stats.mem / planLimits.memLimit) * 100)
      : 0;
  const diskUsedGiB = stats.diskBytes / (1024 * 1024 * 1024);
  const diskPct =
    planLimits.diskLimit > 0
      ? Math.round((diskUsedGiB / planLimits.diskLimit) * 100)
      : 0;
  const cpuUsageRatio =
    planLimits.cpuLimit > 0 ? (cpuPct / planLimits.cpuLimit) * 100 : 0;
  const memoryUsageSummary = `${stats.mem.toFixed(2)} / ${planLimits.memLimit.toFixed(0)} MiB`;
  const diskUsageSummary = `${formatBytes(stats.diskBytes)} / ${planLimits.diskLimit.toFixed(2)} GiB`;
  const hasExplicitAccessState = isOwner || permissions.length > 0;
  const canRunPowerAction = (permission: string) =>
    !hasExplicitAccessState || isOwner || permissions.includes(permission);
  const canSendCommand =
    !hasExplicitAccessState ||
    isOwner ||
    permissions.includes("console:command");

  return (
    <div className="flex flex-col gap-6 h-full min-h-130">
      <section className="rounded-3xl border border-white/10 bg-linear-to-br from-[#0b1222] via-[#0a1020] to-[#070d18] p-6 shadow-[0_20px_60px_rgba(2,8,23,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
              Mission Control
            </p>
            <h1 className="text-2xl font-black text-white mt-2">{botName}</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">
              ID: {serverId?.substring(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-gray-300 bg-white/3">
              {statusLabel}
            </div>
            <button
              onClick={() => doAction("start")}
              disabled={
                status === "running" ||
                !!actionLoading ||
                !canRunPowerAction("power:start")
              }
              className="px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              {actionLoading === "start" ? "Starting..." : "Start"}
            </button>
            <button
              onClick={() => doAction("restart")}
              disabled={
                status === "offline" ||
                !!actionLoading ||
                !canRunPowerAction("power:restart")
              }
              className="px-5 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-bold hover:bg-amber-500/25 transition disabled:opacity-50"
            >
              {actionLoading === "restart" ? "Restarting..." : "Restart"}
            </button>
            <button
              onClick={() => doAction("stop")}
              disabled={
                status === "offline" ||
                !!actionLoading ||
                !canRunPowerAction("power:stop")
              }
              className="px-5 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-bold hover:bg-rose-500/25 transition disabled:opacity-50"
            >
              {actionLoading === "stop" ? "Stopping..." : "Stop"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.7fr_1fr] gap-6 items-start">
        <div className="rounded-3xl border border-white/10 bg-[#0b111e] shadow-[0_20px_60px_rgba(2,8,23,0.5)] overflow-hidden flex flex-col h-[520px]">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#0b1326]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.35em] text-gray-400">
              Terminal Feed
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-bold ${statusColor}`}>
                {statusLabel}
              </span>
              <button
                onClick={() => {
                  if (!serverId) return;
                  patchConsoleSnapshot(serverId, (snapshot) => ({
                    ...snapshot,
                    logs: [],
                  }));
                }}
                className="text-[10px] text-gray-500 hover:text-red-300 font-bold uppercase tracking-wider transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div
            ref={termRef}
            className="flex-1 overflow-y-auto font-mono text-[12.5px] leading-[1.7] p-5 space-y-1 bg-[#0a0f18]"
          >
            {logs.length === 0 && (
              <p className="text-gray-600">
                Dang doi tin hieu console. Vui long refresh neu van trong.
              </p>
            )}
            {logs.map((l, i) => (
              <p key={i} className={levelClass(l.level)}>
                {l.text}
              </p>
            ))}
          </div>

          <div className="border-t border-white/6 bg-[#0e1628] px-5 py-3 flex items-center gap-3">
            <span className="text-cyan-300 font-mono text-sm">$</span>
            <input
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCommand()}
              type="text"
              className="flex-1 bg-transparent text-white font-mono text-[13px] outline-none placeholder-gray-600"
              placeholder={
                status !== "running"
                  ? "Console offline"
                  : !canSendCommand
                    ? "Ban chi co quyen xem console"
                    : "Go lenh..."
              }
              disabled={status !== "running" || !canSendCommand}
            />
            <button
              onClick={sendCommand}
              disabled={status !== "running" || !cmd.trim() || !canSendCommand}
              className="px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Telemetry
            </p>
            <div className="mt-4 grid gap-3">
              {[
                {
                  label: "CPU",
                  value: `${cpuPct.toFixed(1)}%`,
                  tone: "text-purple-300",
                },
                {
                  label: "Memory",
                  value: `${stats.mem.toFixed(2)} MiB`,
                  tone: "text-amber-300",
                },
                {
                  label: "Disk",
                  value: formatBytes(stats.diskBytes),
                  tone: "text-blue-300",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/2 px-4 py-3"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    {item.label}
                  </span>
                  <span className={`text-sm font-bold ${item.tone}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div> */}

          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Live Graphs
            </p>
            <div className="mt-4 grid gap-4">
              {[
                {
                  label: "CPU Load",
                  pct: (cpuPct / planLimits.cpuLimit) * 100,
                  value: `${cpuPct.toFixed(1)}%`,
                  sub: `${cpuUsageRatio.toFixed(1)}% of quota`,
                  color: "from-purple-500 to-purple-700",
                  borderColor: "border-purple-500/20",
                  icon: "⚡",
                  hist: statHistory.cpu,
                  lineColor: "#a855f7",
                },
                {
                  label: "Memory",
                  pct: memPct,
                  value: `${stats.mem.toFixed(2)} MiB`,
                  sub: memoryUsageSummary,
                  color: "from-yellow-400 to-orange-500",
                  borderColor: "border-yellow-500/20",
                  icon: "💾",
                  hist: statHistory.mem,
                  lineColor: "#eab308",
                },
                {
                  label: "Disk",
                  pct: diskPct,
                  value: formatBytes(stats.diskBytes),
                  sub: diskUsageSummary,
                  color: "from-blue-500 to-blue-700",
                  borderColor: "border-blue-500/20",
                  icon: "📦",
                  hist: statHistory.disk,
                  lineColor: "#3b82f6",
                },
              ].map(
                ({
                  label,
                  pct,
                  value,
                  sub,
                  color,
                  borderColor,
                  icon,
                  hist,
                  lineColor,
                }) => (
                  <div
                    key={label}
                    className={`border ${borderColor} rounded-2xl p-4 relative overflow-hidden bg-[#0a0f1c]`}
                  >
                    <div
                      className={`absolute -top-20 -right-16 w-48 h-48 bg-linear-to-br ${color} opacity-20 blur-[70px]`}
                    />
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                        <span className="text-base">{icon}</span>
                        {label}
                      </div>
                      <span className="text-[11px] font-bold text-gray-500">
                        {sub}
                      </span>
                    </div>
                    <div className="text-sm font-black text-white mb-2">
                      {value}
                    </div>
                    <div className="w-full bg-white/4 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(pct, 100)}%` }}
                        className={`h-2 bg-linear-to-r ${color}`}
                      />
                    </div>
                    <div className="mt-3 h-7 flex items-end gap-1">
                      {hist.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${Math.max(5, (v / 100) * 28)}px`,
                            background: lineColor,
                            opacity: 0.2 + (i / hist.length) * 0.8,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
