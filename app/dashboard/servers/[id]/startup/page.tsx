"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DEFAULT_STARTUP_TEMPLATE, DEFAULT_START_COMMAND } from "@/lib/startupTemplate";

const DOCKER_IMAGES = [
  {
    value: "node:20-alpine",
    label: "Nodejs 20",
    category: "Node",
    desc: "Node.js 20 LTS on Alpine Linux",
  },
  {
    value: "node:18-alpine",
    label: "Nodejs 18",
    category: "Node",
    desc: "Node.js 18 LTS on Alpine Linux",
  },
  {
    value: "python:3.11-slim",
    label: "Python 3.11",
    category: "Python",
    desc: "Python 3.11 slim image",
  },
  {
    value: "python:3.10-slim",
    label: "Python 3.10",
    category: "Python",
    desc: "Python 3.10 slim image",
  },
  {
    value: "golang:1.22-alpine",
    label: "Go 1.22",
    category: "Go",
    desc: "Go toolchain trên Alpine",
  },
  {
    value: "eclipse-temurin:21-jdk",
    label: "Java 21",
    category: "Java",
    desc: "JDK 21 cho ứng dụng JVM",
  },
  {
    value: "rust:1.77",
    label: "Rust 1.77",
    category: "Rust",
    desc: "Rust toolchain đầy đủ",
  },
  {
    value: "ubuntu:22.04",
    label: "Ubuntu 22.04",
    category: "Generic",
    desc: "Tự cài runtime và chạy command tùy ý",
  },
];

export default function StartupPage() {
  const params = useParams<{ id: string }>();
  const serverId = params?.id as string;

  const [startScript, setStartScript] = useState(DEFAULT_START_COMMAND);
  const [startupTemplate, setStartupTemplate] = useState(DEFAULT_STARTUP_TEMPLATE);
  const [gitRepo, setGitRepo] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [autoPull, setAutoPull] = useState(false);
  const [gitUser, setGitUser] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [dockerImage, setDockerImage] = useState("node:20-alpine");
  const [customImage, setCustomImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState("");
  const hasGitRepo = gitRepo.trim().length > 0;
  const hasGitToken = gitToken.trim().length > 0;
  const repoHost = gitRepo
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^git@/i, "")
    .split(/[/:]/)[0] || "";
  const gitMode = !hasGitRepo
    ? "manual"
    : hasGitToken
      ? "token"
      : "public";

  useEffect(() => {
    fetch(`/api/servers/${serverId}/startup`)
      .then((r) => r.json())
      .then((h) => {
        if (!h || h.error) return;
        if (h.startCommand) setStartScript(h.startCommand);
        if (h.startupTemplate) setStartupTemplate(h.startupTemplate);
        if (h.envType) {
          setDockerImage(h.envType);
          if (!DOCKER_IMAGES.some((image) => image.value === h.envType)) {
            setCustomImage(h.envType);
          }
        }
        if (h.gitRepo) setGitRepo(h.gitRepo);
        if (h.gitBranch) setGitBranch(h.gitBranch);
        if (typeof h.autoPull === "boolean") setAutoPull(h.autoPull);
        if (h.gitUser) setGitUser(h.gitUser);
        if (h.gitToken) setGitToken(h.gitToken);
      })
      .catch(() => {});
  }, [serverId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/servers/${serverId}/startup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startCommand: startScript,
          startupTemplate,
          envType: customImage.trim() || dockerImage,
          gitRepo,
          gitBranch,
          autoPull,
          gitUser,
          gitToken,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleDetect = async () => {
    setDetecting(true);
    setDetectMessage("");
    try {
      const res = await fetch(`/api/servers/${serverId}/startup`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setDetectMessage(data.error || "Không thể detect startup.");
      } else {
        setStartScript(data.startCommand || DEFAULT_START_COMMAND);
        if (data.envType) {
          if (DOCKER_IMAGES.some((image) => image.value === data.envType)) {
            setDockerImage(data.envType);
            setCustomImage("");
          } else {
            setCustomImage(data.envType);
          }
        }
        setDetectMessage(data.reason || "Đã detect startup từ source.");
      }
    } catch {
      setDetectMessage("Không thể detect startup.");
    }
    setDetecting(false);
  };

  const liveCommand = startupTemplate.replace("{{STARTUPSCRIPT}}", startScript);
  const effectiveImage = customImage.trim() || dockerImage;
  const selectedImage = DOCKER_IMAGES.find((i) => i.value === effectiveImage);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1222] via-[#0a1020] to-[#070d18] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
              Startup Blueprint
            </p>
            <h1 className="text-2xl font-black text-white mt-2">Cấu hình khởi chạy</h1>
            <p className="text-xs text-gray-500 mt-1">
              Thiết lập runtime, git và script khởi động cho server.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-sm font-bold hover:bg-cyan-500/25 transition disabled:opacity-50"
            >
              {detecting ? "Đang detect..." : "Detect startup from files"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        </div>
      </section>

      {saved && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm font-bold px-4 py-3">
          Cấu hình đã được cập nhật.
        </div>
      )}
      {!!detectMessage && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 text-sm font-bold px-4 py-3">
          {detectMessage}
        </div>
      )}

      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Startup Template
            </p>
            <textarea
              className="mt-4 w-full bg-[#0a0f18] rounded-2xl p-4 font-mono text-[12px] text-cyan-200 leading-relaxed min-h-[180px] resize-none outline-none border border-white/10"
              value={startupTemplate}
              onChange={(e) => setStartupTemplate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-3">
              Dùng <span className="text-cyan-300 font-mono">{"{{STARTUPSCRIPT}}"}</span> để nhúng lệnh start.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Lệnh khởi chạy
            </p>
            <input
              className="mt-4 w-full bg-[#0a0f18] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-mono outline-none"
              value={startScript}
              onChange={(e) => setStartScript(e.target.value)}
              placeholder="AUTO"
            />
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/2 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Preview</p>
              <p className="mt-2 text-xs font-mono text-gray-300 whitespace-pre-wrap break-words">
                {liveCommand}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Runtime Stack
            </p>
            <div className="mt-4 grid gap-3">
              {DOCKER_IMAGES.map((image) => (
                <button
                  key={image.label}
                  onClick={() => {
                    setDockerImage(image.value);
                    setCustomImage("");
                  }}
                  className={`text-left rounded-2xl border px-4 py-3 transition ${
                    effectiveImage === image.value
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/2 hover:bg-white/5"
                  }`}
                >
                  <p className="text-sm font-bold text-white">{image.label}</p>
                  <p className="text-xs text-gray-500">{image.desc}</p>
                </button>
              ))}
            </div>
            <input
              className="mt-4 w-full bg-[#0a0f18] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none"
              value={customImage}
              onChange={(e) => setCustomImage(e.target.value)}
              placeholder="Custom Docker image, ví dụ ubuntu:22.04"
            />
            {selectedImage && (
              <div className="mt-4 text-xs text-cyan-300 font-mono">{selectedImage.value}</div>
            )}
            {!selectedImage && effectiveImage && (
              <div className="mt-4 text-xs text-cyan-300 font-mono">{effectiveImage}</div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Git Pipeline
            </p>
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">Repository</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Kết nối repo để sync source thật khi container start, restart hoặc reinstall.
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                      hasGitRepo
                        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                        : "border-white/10 bg-white/5 text-gray-500"
                    }`}
                  >
                    {hasGitRepo ? "Connected" : "Manual"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c1220] px-4 py-3 text-white text-sm outline-none transition focus:border-cyan-500/40"
                    value={gitRepo}
                    onChange={(e) => setGitRepo(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-[#0c1220] px-4 py-3 text-white text-sm outline-none transition focus:border-cyan-500/40"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      placeholder="main"
                      disabled={!hasGitRepo}
                    />
                    <button
                      type="button"
                      onClick={() => hasGitRepo && setAutoPull(!autoPull)}
                      disabled={!hasGitRepo}
                      className={`group flex min-w-34 items-center justify-between rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${
                        hasGitRepo
                          ? autoPull
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/8"
                          : "border-white/10 bg-white/4 text-gray-600"
                      }`}
                    >
                      <span>Auto Pull</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] ${
                          hasGitRepo
                            ? autoPull
                              ? "bg-emerald-500/20 text-emerald-100"
                              : "bg-white/8 text-gray-400"
                            : "bg-white/6 text-gray-600"
                        }`}
                      >
                        {autoPull ? "On" : "Off"}
                      </span>
                    </button>
                  </div>
                </div>
                {hasGitRepo && (
                  <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold uppercase tracking-[0.24em] text-gray-500">Mode</span>
                      <span
                        className={`rounded-full border px-2.5 py-1 font-bold uppercase tracking-[0.24em] ${
                          gitMode === "token"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {gitMode === "token" ? "Token Auth" : "Public Repo"}
                      </span>
                      {repoHost && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-gray-300">
                          {repoHost}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 leading-relaxed">
                      {gitMode === "token"
                        ? "Server sẽ dùng username nếu có, nếu không sẽ fallback sang x-access-token để pull private repo hoặc repo cần xác thực."
                        : "Repo public có thể pull trực tiếp mà không cần credentials. Nếu bị rate limit hoặc repo private, hãy thêm token."}
                    </p>
                  </div>
                )}
              </div>

              <div className={`rounded-2xl border p-4 transition ${
                hasGitRepo
                  ? "border-white/10 bg-[#0a0f18]"
                  : "border-white/6 bg-[#090d16] opacity-65"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">Credentials</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Dùng cho private repo, token auth, hoặc khi provider yêu cầu username đi kèm token.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">
                    {hasGitToken ? "Active" : "Optional"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c1220] px-4 py-3 text-white text-sm outline-none transition focus:border-cyan-500/40 disabled:cursor-not-allowed disabled:text-gray-500"
                    value={gitUser}
                    onChange={(e) => setGitUser(e.target.value)}
                    placeholder="Git username hoặc oauth user"
                    disabled={!hasGitRepo}
                  />
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[#0c1220] px-4 py-3 text-white text-sm outline-none transition focus:border-cyan-500/40 disabled:cursor-not-allowed disabled:text-gray-500"
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    placeholder="Git token / personal access token"
                    disabled={!hasGitRepo}
                  />
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-gray-500">
                  {hasGitRepo
                    ? hasGitToken
                      ? "Credentials đang được lưu và sẽ được inject vào remote URL khi auto pull chạy."
                      : "Để trống nếu repo public. Trường username một mình sẽ không được dùng nếu không có token."
                    : "Kết nối repo trước rồi credentials mới có tác dụng."}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/2 px-4 py-3 text-xs text-gray-500 leading-relaxed">
                {hasGitRepo
                  ? autoPull
                    ? "Server sẽ tự fetch và sync repo theo branch đã chọn mỗi lần container khởi động."
                    : "Repo đã kết nối nhưng Auto Pull đang tắt. Source hiện tại trong /home/container sẽ được giữ nguyên."
                  : "Để trống phần Git nếu bạn upload source thủ công trong tab Files."}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
