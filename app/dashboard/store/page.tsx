"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PLAN_CONFIG, PLAN_ORDER, type PlanId } from "@/lib/planConfig";

type StorePlan = {
  id: PlanId;
  name: string;
  price: number;
  periodLabel?: string;
  color: string;
  border: string;
  accentColor: string;
  features: string[];
  highlight: boolean;
  badge?: string;
};

const PLAN_THEME: Record<
  PlanId,
  Pick<StorePlan, "name" | "color" | "border" | "accentColor" | "highlight" | "badge">
> = {
  free: {
    name: "Free",
    color: "from-gray-600/20 to-gray-700/10",
    border: "border-gray-600/20",
    accentColor: "text-gray-300",
    highlight: false,
  },
  basic: {
    name: "Basic",
    color: "from-blue-600/15 to-blue-700/5",
    border: "border-blue-500/20",
    accentColor: "text-blue-400",
    highlight: true,
    badge: "PHỔ BIẾN",
  },
  pro: {
    name: "Pro",
    color: "from-cyan-600/20 to-blue-600/10",
    border: "border-cyan-500/40",
    accentColor: "text-cyan-400",
    highlight: true,
  },
  premium: {
    name: "Premium",
    color: "from-purple-600/20 to-indigo-600/10",
    border: "border-purple-500/30",
    accentColor: "text-purple-400",
    highlight: false,
  },
};

function buildStorePlans(planMap: Record<string, any>): StorePlan[] {
  return PLAN_ORDER.map((id) => {
    const plan = planMap?.[id] || {};
    const theme = PLAN_THEME[id];
    return {
      id,
      name: theme.name,
      price: Number(plan.price || 0),
      periodLabel: String(plan.periodLabel || ""),
      color: theme.color,
      border: theme.border,
      accentColor: theme.accentColor,
      highlight: theme.highlight,
      badge: theme.badge,
      features: [
        `${Number(plan.ramMb || 0) >= 1024 ? `${(Number(plan.ramMb || 0) / 1024).toFixed(Number(plan.ramMb || 0) % 1024 === 0 ? 0 : 1)} GB` : `${Number(plan.ramMb || 0)} MB`} RAM`,
        `${Number(plan.cpuCores || 0)} vCPU`,
        `${Number(plan.diskGb || 0)} GB SSD`,
        `${Number(plan.slotLimit || 0)} slot/node`,
        id === "free"
          ? `Dùng thử ${plan.periodLabel || "7 ngày"}`
          : `Chu kỳ ${plan.periodLabel || "tháng"}`,
      ],
    };
  });
}

function getRemainingDays(expiresAt?: string | null) {
  if (!expiresAt) return null;
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000),
  );
}

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentHosting, setCurrentHosting] = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [planAvailability, setPlanAvailability] = useState<Record<string, any>>(
    {},
  );
  const [plans, setPlans] = useState<StorePlan[]>(buildStorePlans(PLAN_CONFIG));
  const autoStartedRef = useRef(false);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setCurrentHosting(data.hosting);
        setBalance(data.balance || 0);
        setPlanAvailability(data.planAvailability || {});
        setPlans(buildStorePlans(data.plans || {}));
        setDaysLeft(getRemainingDays(data.hosting?.expiresAt ?? null));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentPlanIndex = currentHosting
    ? PLAN_ORDER.indexOf(currentHosting.planId)
    : -1;

  const getPlanStatus = (planId: PlanId) => {
    const idx = PLAN_ORDER.indexOf(planId);
    if (currentHosting?.planId === planId) return "current";
    if (!currentHosting && planId === "free") return "available";
    if (currentHosting && idx > currentPlanIndex) return "upgrade";
    if (currentHosting && idx <= currentPlanIndex) return "lower"; // can't downgrade
    return "available";
  };

  const handleBuy = async (planId: PlanId) => {
    setError("");
    setSuccess("");
    setBuyingPlan(planId);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(
          data.action === "upgraded"
            ? `Đã nâng cấp lên gói ${planId.toUpperCase()}!`
            : `Đã đăng ký gói ${planId.toUpperCase()}!`,
        );
        // Reload hosting info
        const r2 = await fetch("/api/orders").then((r) => r.json());
        setCurrentHosting(r2.hosting);
        setBalance(r2.balance || 0);
        setPlanAvailability(r2.planAvailability || {});
        setPlans(buildStorePlans(r2.plans || {}));
        setDaysLeft(getRemainingDays(r2.hosting?.expiresAt ?? null));
        setTimeout(() => router.push("/dashboard/hosting"), 1500);
      } else {
        setError(data.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối mạng");
    }
    setBuyingPlan(null);
  };

  useEffect(() => {
    if (loading || autoStartedRef.current || !searchParams) return;

    const rawPlanId = searchParams.get("plan");
    if (!rawPlanId || !PLAN_ORDER.includes(rawPlanId as PlanId)) return;
    const planId = rawPlanId as PlanId;

    const planStatus = getPlanStatus(planId);
    if (planStatus !== "available" && planStatus !== "upgrade") {
      autoStartedRef.current = true;
      return;
    }

    autoStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void handleBuy(planId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentHosting, loading, searchParams]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Chọn gói Hosting
        </h1>
        <p className="text-gray-400">
          Mỗi tài khoản có{" "}
          <strong className="text-white">1 slot hosting duy nhất</strong>. Bạn
          có thể nâng cấp bất kỳ lúc nào.
        </p>
      </div>

      {/* Current Status */}
      {!loading && (
        <div
          className={`rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            currentHosting
              ? "bg-linear-to-r from-cyan-500/10 to-blue-500/5 border border-cyan-500/20"
              : "bg-white/3 border border-white/6"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${
                currentHosting
                  ? "bg-cyan-500/15 border-cyan-500/25"
                  : "bg-white/4 border-white/8"
              }`}
            >
              {currentHosting ? "🚀" : "📦"}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                {currentHosting ? "GÓI HIỆN TẠI" : "CHƯA CÓ GÓI"}
              </p>
              {currentHosting ? (
                <div className="flex items-center gap-3">
                  <span className="text-white font-black text-lg capitalize">
                    {currentHosting.planId}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border ${
                      currentHosting.status === "active"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {currentHosting.status === "active" ? (
                      <>
                        <span
                          className="dot-online"
                          style={{ width: 6, height: 6 }}
                        ></span>{" "}
                        Đang hoạt động
                      </>
                    ) : (
                      "Tạm ngừng"
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-white font-bold">
                  Chưa đăng ký gói nào — bắt đầu với Free!
                </p>
              )}
              {currentHosting?.expiresAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Hết hạn:{" "}
                  {new Date(currentHosting.expiresAt).toLocaleDateString(
                    "vi-VN",
                  )}
                  {" · "}
                  Còn {daysLeft ?? 0} ngày
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-bold mb-1">Số dư</p>
            <p className="text-xl font-black text-cyan-400">
              {balance.toLocaleString("vi-VN")} đ
            </p>
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm font-bold flex items-center gap-3">
          <svg
            className="w-5 h-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {success} Đang chuyển hướng...
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const planStatus = getPlanStatus(plan.id);
          const availability = planAvailability?.[plan.id];
          const isCurrent = planStatus === "current";
          const isLower = planStatus === "lower";
          const isUpgrade = planStatus === "upgrade";
          const isBuying = buyingPlan === plan.id;
          const isUnavailable =
            !isCurrent && availability && availability.available === false;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col transition-all duration-200 overflow-hidden ${
                plan.highlight
                  ? `bg-linear-to-b ${plan.color} ${plan.border} shadow-[0_0_40px_rgba(6,182,212,0.12)] -translate-y-1`
                  : isCurrent
                    ? `bg-linear-to-b ${plan.color} ${plan.border}`
                    : isLower
                      ? "bg-white/2 border-white/4 opacity-50"
                      : `bg-linear-to-b ${plan.color} ${plan.border} hover:brightness-110`
              }`}
            >
              {/* Gradient top bar */}
              {(plan.highlight || isCurrent) && (
                <div className="h-0.5 bg-linear-to-r from-cyan-400 to-blue-500 w-full" />
              )}

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-black bg-linear-to-r from-cyan-400 to-blue-500 text-white px-2.5 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-black bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full">
                    GÓI ĐÃ DÙNG
                  </span>
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Plan title */}
                <h3
                  className={`text-lg font-black mb-1 ${isCurrent ? "text-white" : plan.accentColor}`}
                >
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6 mt-1">
                  {plan.price === 0 ? (
                    <div className="flex flex-col">
                      <span className="text-3xl font-black text-white">
                        Miễn phí
                      </span>
                      <span className="text-xs text-gray-500 font-bold">
                        {plan.periodLabel || "7 ngày dùng thử"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`text-3xl font-black ${plan.accentColor}`}
                      >
                        {plan.price.toLocaleString("vi-VN")}đ
                      </span>
                      <span className="text-xs text-gray-500">/{plan.periodLabel || "tháng"}</span>
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
                      <svg
                        className={`w-4 h-4 shrink-0 ${plan.accentColor}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {isUnavailable && (
                  <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300">
                    {availability.reason}
                  </div>
                )}

                {/* CTA Button */}
                {isLower ? (
                  <div className="w-full py-3 text-center text-xs font-bold text-gray-600 border border-white/4 rounded-xl cursor-not-allowed">
                    Không thể hạ cấp
                  </div>
                ) : isCurrent ? (
                  <div className="w-full py-3 text-center text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl">
                    ✓ Đang sử dụng
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(plan.id)}
                    disabled={isBuying || !!success || isUnavailable}
                    className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                      plan.highlight
                        ? "bg-linear-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                        : `bg-white/6 hover:bg-white/10 border ${plan.border} ${plan.accentColor}`
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0`}
                  >
                    {isBuying ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Đang xử lý...
                      </span>
                    ) : isUnavailable ? (
                      "Tạm hết tài nguyên"
                    ) : isUpgrade ? (
                      ` Nâng cấp lên ${plan.name}`
                    ) : plan.price === 0 ? (
                      "Đăng ký miễn phí"
                    ) : (
                      `Mua ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 text-sm text-amber-300/80 leading-relaxed">
        <p className="font-bold text-amber-300 mb-2">📌 Lưu ý quan trọng:</p>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>
            Mỗi tài khoản có <strong>đúng 1 slot hosting</strong> — 1 bot duy
            nhất.
          </li>
          <li>
            Gói <strong>Free</strong> chỉ đăng ký được <strong>1 lần</strong>{" "}
            trên mỗi tài khoản.
          </li>
          <li>
            Mỗi gói có <strong>slot giới hạn</strong>. Khi node đầy RAM/SSD hoặc
            hết slot, hệ thống sẽ tạm khóa mua thêm.
          </li>
          <li>
            Bạn chỉ có thể <strong>nâng cấp</strong> lên gói cao hơn, không được
            hạ xuống.
          </li>
          <li>
            Sau khi mua gói, file bot sẽ được upload trực tiếp qua giao diện
            Files trong panel.
          </li>
        </ul>
      </div>
    </div>
  );
}
