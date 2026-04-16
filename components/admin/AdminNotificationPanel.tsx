"use client";

import { useState } from "react";

const TARGET_OPTIONS = [
  { value: "all", label: "Toàn bộ user" },
  { value: "users", label: "Chỉ user thường" },
  { value: "admins", label: "Chỉ admin" },
  { value: "user", label: "Một Discord ID" },
];

export function AdminNotificationPanel() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error">(
    "success",
  );

  const handleSend = async () => {
    setFeedback("");
    setSending(true);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          target,
          targetUserId,
          type: "info",
          link: "/dashboard",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedbackType("error");
        setFeedback(data.error || "Không thể gửi thông báo.");
      } else {
        setFeedbackType("success");
        setFeedback(`Đã gửi ${data.delivered || 0} thông báo.`);
        setTitle("");
        setMessage("");
        setTargetUserId("");
      }
    } catch {
      setFeedbackType("error");
      setFeedback("Lỗi kết nối khi gửi thông báo.");
    }

    setSending(false);
  };

  return (
    <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Thông báo hệ thống</h2>
          <p className="text-sm text-gray-500">
            Gửi thông báo tới user hoặc admin trực tiếp trong dashboard.
          </p>
        </div>
        <span className="text-[11px] px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
          Notification Center
        </span>
      </div>

      <div className="p-6 grid gap-4">
        <div className="grid md:grid-cols-[1fr_220px] gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề thông báo"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
          />
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
          >
            {TARGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {target === "user" && (
          <input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Discord ID người nhận"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
          />
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nội dung thông báo"
          rows={4}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30 resize-none"
        />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Dùng cho bảo trì, thay đổi gói, nhắc topup, hoặc cảnh báo hệ thống.
          </p>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25 transition disabled:opacity-50"
          >
            {sending ? "Đang gửi..." : "Gửi thông báo"}
          </button>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              feedbackType === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/20 bg-red-500/10 text-red-300"
            }`}
          >
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
