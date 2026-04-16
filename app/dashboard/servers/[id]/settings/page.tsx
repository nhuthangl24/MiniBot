"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const STARTUP_SCRIPT_PREVIEW = `clear; echo -e "——————[ Powered by Dashboard ]——————\\n"; cd /home/container || exit 1; if [ "$AUTO_PULL" = "1" ]; then echo "Auto pulling..."; if [ -n "$GIT_TOKEN" ]; then git remote set-url origin "https://x-access-token:\${GIT_TOKEN}@\$(echo "$GIT_ADDRESS" | sed -E 's#https?://#')"; fi; git fetch origin && git reset --hard origin/\${BRANCH:-main}; fi; {{STARTUPSCRIPT}}`;

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const serverId = params?.id as string;

  const [botName, setBotName] = useState("");
  const [description, setDescription] = useState("");
  const [hostingId, setHostingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [showReinstallConfirm, setShowReinstallConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/servers/${serverId}/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.error) {
          setBotName(d.botName || "");
          setDescription(d.description || "");
          setHostingId(d.hostingId || "");
        }
      })
      .catch(() => {});
  }, [serverId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/servers/${serverId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botName, description }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleReinstall = async () => {
    if (!showReinstallConfirm) {
      setShowReinstallConfirm(true);
      return;
    }
    setReinstalling(true);
    try {
      await fetch(`/api/servers/${serverId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reinstall" }),
      });
      router.push(`/dashboard/servers/${serverId}`);
    } catch {}
    setReinstalling(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1222] via-[#0a1020] to-[#070d18] p-6">
        <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
          Server Profile
        </p>
        <h1 className="text-2xl font-black text-white mt-2">Cài đặt máy chủ</h1>
        <p className="text-xs text-gray-500 mt-1">Đổi tên, mô tả và thao tác nâng cao.</p>
      </section>

      {saved && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm font-bold px-4 py-3">
          Thay đổi đã được lưu.
        </div>
      )}

      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Thông tin cơ bản
            </p>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Tên server
                </label>
                <input
                  className="w-full bg-[#0a0f18] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="My Bot"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#0a0f18] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none resize-none placeholder-gray-600"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bot music, bot auto-mod..."
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm font-bold hover:bg-emerald-500/30 transition disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Startup Preview
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0f18] p-4 font-mono text-[11px] text-cyan-200 leading-relaxed">
              {STARTUP_SCRIPT_PREVIEW}
            </div>
            <div className="mt-4">
              <Link
                href={`/dashboard/servers/${serverId}/startup`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-bold"
              >
                Mở tab Startup
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Reinstall
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Dùng khi server lỗi hoặc cần làm mới runtime. Files thường giữ nguyên.
            </p>
            {showReinstallConfirm && (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs font-bold px-3 py-2">
                ⚠️ Xác nhận reinstall? Hành động này không thể hoàn tác!
              </div>
            )}
            <button
              onClick={handleReinstall}
              disabled={reinstalling}
              className="mt-4 w-full px-4 py-2.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm font-bold hover:bg-rose-500/25 transition disabled:opacity-50"
            >
              {reinstalling
                ? "Đang reinstall..."
                : showReinstallConfirm
                  ? "Xác nhận Reinstall"
                  : "Reinstall Server"}
            </button>
            {showReinstallConfirm && !reinstalling && (
              <button
                onClick={() => setShowReinstallConfirm(false)}
                className="mt-2 w-full text-xs text-gray-500 hover:text-white"
              >
                Hủy
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b111e] p-6">
            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
              Debug info
            </p>
            <div className="mt-4 grid gap-2 text-xs">
              {[
                { label: "Hosting ID", value: hostingId?.substring(0, 20) + "..." || "—" },
                { label: "Server ID", value: serverId?.substring(0, 8).toUpperCase() || "—" },
                { label: "Server Node", value: "Node" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
