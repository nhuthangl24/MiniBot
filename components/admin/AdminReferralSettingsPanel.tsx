"use client";

import { useEffect, useState } from "react";

export function AdminReferralSettingsPanel() {
  const [form, setForm] = useState({
    enabled: true,
    defaultLinkBonus: 2000,
    firstReferralBonus: 10000,
    repeatReferralBonus: 5000,
    promoEndsAt: "",
    announcementTitle: "",
    announcementMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch("/api/referral/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          enabled: Boolean(data.enabled),
          defaultLinkBonus: Number(data.defaultLinkBonus || 0),
          firstReferralBonus: Number(data.firstReferralBonus || 0),
          repeatReferralBonus: Number(data.repeatReferralBonus || 0),
          promoEndsAt: data.promoEndsAt ? String(data.promoEndsAt).slice(0, 10) : "",
          announcementTitle: data.announcementTitle || "",
          announcementMessage: data.announcementMessage || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setFeedback("");
    try {
      const res = await fetch("/api/referral/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setFeedback(res.ok ? "Đã lưu cấu hình referral." : data.error || "Không thể lưu cấu hình.");
    } catch {
      setFeedback("Lỗi kết nối khi lưu referral.");
    }
    setSaving(false);
  };

  return (
    <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Cấu hình referral</h2>
          <p className="text-sm text-gray-500">
            Chỉnh mức thưởng và nội dung hiển thị ở khối mã giới thiệu.
          </p>
        </div>
        <span className="text-[11px] px-3 py-1.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 font-bold">
          Referral Config
        </span>
      </div>

      <div className="p-6 grid gap-4">
        <label className="flex items-center gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          Bật chương trình referral
        </label>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["defaultLinkBonus", "Thưởng mặc định"],
            ["firstReferralBonus", "Thưởng lượt đầu"],
            ["repeatReferralBonus", "Thưởng từ lượt 2"],
          ].map(([key, label]) => (
            <input
              key={key}
              type="number"
              value={(form as any)[key]}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [key]: Number(e.target.value || 0) }))
              }
              placeholder={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
            />
          ))}
        </div>

        <input
          type="date"
          value={form.promoEndsAt}
          onChange={(e) => setForm((prev) => ({ ...prev, promoEndsAt: e.target.value }))}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
        />

        <input
          value={form.announcementTitle}
          onChange={(e) => setForm((prev) => ({ ...prev, announcementTitle: e.target.value }))}
          placeholder="Tiêu đề thông báo referral"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
        />

        <textarea
          value={form.announcementMessage}
          onChange={(e) => setForm((prev) => ({ ...prev, announcementMessage: e.target.value }))}
          placeholder="Nội dung hiển thị trong khối referral"
          rows={7}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30 whitespace-pre-wrap"
        />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            Nếu ưu đãi còn hiệu lực, thưởng lượt đầu và từ lượt 2 sẽ được ưu tiên hơn thưởng mặc định.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30 px-4 py-2.5 text-sm font-bold text-fuchsia-200 hover:bg-fuchsia-500/25 transition disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu referral"}
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
