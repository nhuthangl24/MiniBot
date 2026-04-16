"use client";

import { useState } from "react";

export function AdminManualBalancePanel() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setFeedback("");
    try {
      const res = await fetch("/api/admin/manual-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: Number(amount || 0),
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Không thể cộng tiền thủ công.");
      } else {
        setFeedback(
          `Đã cộng ${Number(amount || 0).toLocaleString("vi-VN")}đ cho ${data.targetUserId}. Số dư mới: ${Number(data.balance || 0).toLocaleString("vi-VN")}đ.`,
        );
        setUserId("");
        setAmount("");
        setReason("");
      }
    } catch {
      setFeedback("Lỗi kết nối khi cộng tiền thủ công.");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Cộng tiền thủ công</h2>
          <p className="text-sm text-gray-500">
            Dùng khi cổng giao dịch lỗi hoặc cần bù thủ công cho user.
          </p>
        </div>
        <span className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
          Manual Credit
        </span>
      </div>

      <div className="p-6 grid gap-4">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Discord ID hoặc email user"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Số tiền cần cộng"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do cộng tiền"
          rows={4}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30 resize-none"
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Giao dịch sẽ được ghi vào lịch sử với loại `manual_credit` và user sẽ nhận thông báo.
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-500/25 transition disabled:opacity-50"
          >
            {submitting ? "Đang cộng..." : "Cộng tiền"}
          </button>
        </div>

        {!!feedback && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-200">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}
