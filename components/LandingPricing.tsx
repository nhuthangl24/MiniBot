"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PricingPlan = {
  name: string;
  tag: string;
  desc: string;
  price: string;
  periodLabel?: string;
  features: string[];
  buttonText: string;
  highlight?: boolean;
  badge?: string;
};

type LandingPricingProps = {
  loggedIn: boolean;
  plans: PricingPlan[];
};

const PLAN_IDS: Record<string, string> = {
  "Free Trial": "free",
  Basic: "basic",
  Pro: "pro",
  Premium: "premium",
};

export function LandingPricing({ loggedIn, plans }: LandingPricingProps) {
  const router = useRouter();
  const [buyingPlan, setBuyingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const handleBuy = async (planName: string) => {
    const planId = PLAN_IDS[planName];
    if (!planId) return;

    if (!loggedIn) {
      signIn("discord", { callbackUrl: `/dashboard/store?plan=${planId}` });
      return;
    }

    setBuyingPlan(planId);
    setMessage("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error || "Không thể mua gói lúc này.");
        if (planId !== "free" && typeof data.error === "string" && data.error.includes("Số dư không đủ")) {
          setTimeout(() => router.push("/dashboard/topup"), 1200);
        }
        return;
      }

      setMessageType("success");
      setMessage(
        planId === "free"
          ? "Đã tạo gói Free dùng thử 7 ngày. Đang chuyển sang trang hosting."
          : `Đã mua gói ${planName} thành công. Đang chuyển sang trang hosting.`,
      );
      setTimeout(() => router.push("/dashboard/hosting"), 1000);
    } catch {
      setMessageType("error");
      setMessage("Không thể kết nối tới máy chủ.");
    } finally {
      setBuyingPlan(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl w-full">
      {!!message && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
            messageType === "success"
              ? "border-green-500/20 bg-green-500/10 text-green-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      {plans.map((plan, idx) => {
        const planId = PLAN_IDS[plan.name];
        const isBuying = buyingPlan === planId;

        return (
          <div
            key={idx}
            className={`relative rounded-[2rem] p-8 flex flex-col lg:flex-row lg:items-center gap-8 transition-all duration-300 ${
              plan.highlight
                ? "bg-gradient-to-r from-[#0c1328] via-[#0a1020] to-[#0a0f1c] border-2 border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.12)]"
                : "bg-[#0a0f1c] border border-white/10 hover:border-white/20 hover:bg-[#0c1222]"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-6 bg-gradient-to-r from-cyan-400 to-blue-400 text-black text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                {plan.badge}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-3 block">
                {plan.name} Plan
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                {plan.tag}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed font-medium mb-6">
                {plan.desc}
              </p>
              <div className="flex flex-wrap gap-3">
                {plan.features.map((feature, fIdx) => (
                  <span
                    key={fIdx}
                    className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-200 text-xs font-semibold px-3 py-2 rounded-full"
                  >
                    <span className="text-cyan-400">●</span>
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-56 flex flex-col items-start lg:items-end gap-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white tracking-tight">
                  {plan.price}
                </span>
                {(plan.periodLabel || plan.price !== "0đ") && (
                  <span className="text-gray-500 font-bold mb-1">
                    /{plan.periodLabel || "tháng"}
                  </span>
                )}
              </div>

              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => void handleBuy(plan.name)}
                  disabled={isBuying}
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isBuying ? "Đang xử lý..." : plan.buttonText}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signIn("discord", { callbackUrl: `/dashboard/store?plan=${planId}` })}
                  className={`w-full text-center py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                    plan.highlight
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {plan.buttonText}
                </button>
              )}

              {loggedIn && planId !== "free" && (
                <Link
                  href="/dashboard/topup"
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Nạp tiền trước nếu chưa đủ số dư
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
