"use client";

import { useEffect, useState } from "react";

const PLAN_ORDER = ["free", "basic", "pro", "premium"];

export function AdminPlansPanel() {
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [nodeCapacity, setNodeCapacity] = useState({ ramMb: 0, diskGb: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || {});
        setNodeCapacity(data.nodeCapacity || { ramMb: 0, diskGb: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setFeedback("");
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans, nodeCapacity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || "Không thể lưu gói cước.");
      } else {
        setPlans(data.plans || {});
        setNodeCapacity(data.nodeCapacity || nodeCapacity);
        setFeedback("Đã cập nhật gói cước.");
      }
    } catch {
      setFeedback("Lỗi kết nối khi lưu gói cước.");
    }
    setSaving(false);
  };

  return (
    <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/[0.05] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">Quản lý gói cước</h2>
          <p className="text-sm text-gray-500">
            Chỉnh giá, RAM, CPU, SSD và slot limit cho từng plan.
          </p>
        </div>
        <span className="text-[11px] px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
          Plans
        </span>
      </div>

      <div className="p-6 grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            type="number"
            value={nodeCapacity.ramMb}
            onChange={(e) =>
              setNodeCapacity((prev) => ({ ...prev, ramMb: Number(e.target.value || 0) }))
            }
            placeholder="RAM node (MB)"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
          />
          <input
            type="number"
            value={nodeCapacity.diskGb}
            onChange={(e) =>
              setNodeCapacity((prev) => ({ ...prev, diskGb: Number(e.target.value || 0) }))
            }
            placeholder="Disk node (GB)"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
          />
        </div>

        <div className="grid gap-4">
          {PLAN_ORDER.map((planId) => {
            const plan = plans[planId] || {};
            return (
              <div key={planId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">{planId}</h3>
                  <span className="text-xs text-gray-500">{plan.shortLabel || plan.label || planId}</span>
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  {[
                    ["price", "Giá"],
                    ["ramMb", "RAM MB"],
                    ["cpuCores", "vCPU"],
                    ["diskGb", "Disk GB"],
                    ["slotLimit", "Slot"],
                  ].map(([key, label]) => (
                    <input
                      key={`${planId}-${key}`}
                      type="number"
                      step={key === "cpuCores" ? "0.1" : "1"}
                      value={plan[key] ?? 0}
                      onChange={(e) =>
                        setPlans((prev) => ({
                          ...prev,
                          [planId]: {
                            ...prev[planId],
                            [key]: Number(e.target.value || 0),
                          },
                        }))
                      }
                      placeholder={label}
                      className="rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/30"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            {loading ? "Đang tải cấu hình..." : "Thay đổi sẽ áp dụng cho việc mua gói mới và limit khi start/restart container."}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-500/25 transition disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu gói cước"}
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
