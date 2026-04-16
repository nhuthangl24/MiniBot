"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, History, Settings, Wallet } from "lucide-react";

type ProfileMenuProps = {
  name?: string | null;
  image?: string | null;
  userId?: string | null;
  discordId?: string | null;
};

const MENU_LINKS = [
  { href: "/dashboard/topup", label: "Nạp tiền", icon: Wallet },
  { href: "/dashboard/history", label: "Lịch sử", icon: History },
  { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
];

export function ProfileMenu({ name, image, userId, discordId }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referral, setReferral] = useState<any>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [referralSuccess, setReferralSuccess] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const referralCode =
    referral?.referralCode ||
    discordId ||
    userId ||
    (name ? name.replace(/\s+/g, "").toLowerCase() : "mb-user");

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || referral) return;
    setLoadingReferral(true);
    fetch("/api/referral")
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error) {
          setReferral(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingReferral(false));
  }, [open, referral]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralInput.trim()) {
      setReferralError("Nhập mã giới thiệu trước khi xác nhận.");
      return;
    }
    setSubmittingReferral(true);
    setReferralError("");
    setReferralSuccess("");
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReferralError(data.error || "Không thể áp dụng mã giới thiệu.");
      } else {
        setReferral((prev: any) => ({
          ...(prev || {}),
          referredBy: data.referredBy,
          referralCode,
          totalReferrals: Math.max(1, Number(prev?.totalReferrals || 0)),
          rewardedReferrals: Math.max(1, Number(prev?.rewardedReferrals || 0)),
          pendingReferrals: 0,
          totalReward:
            Number(prev?.totalReward || 0) + Number(data.awardedAmount || 0),
        }));
        setReferralSuccess(
          `Đã ghi nhận người giới thiệu: ${data.referredBy.username}. Người giới thiệu được cộng ngay ${Number(data.awardedAmount || 0).toLocaleString("vi-VN")}đ.`,
        );
        setReferralInput("");
      }
    } catch {
      setReferralError("Lỗi kết nối khi áp dụng mã giới thiệu.");
    }
    setSubmittingReferral(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 bg-[#0a0f1c] border border-white/10 px-1.5 py-1.5 pr-4 rounded-full shadow-lg shadow-black/20 relative group cursor-pointer hover:border-cyan-500/30 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 rounded-full transition-all duration-500" />
        <img
          src={image || "https://cdn.discordapp.com/embed/avatars/0.png"}
          className="w-8 h-8 rounded-full border border-white/10 relative z-10 object-cover"
          alt="avatar"
        />
        <span className="text-sm text-gray-200 font-bold relative z-10">
          {name || "User"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-[320px] rounded-2xl border border-white/10 bg-[#0a0f1c] shadow-2xl shadow-black/40 p-4 z-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-[0.2em]">
                Referral
              </p>
              <p className="text-lg font-bold text-white">Mã giới thiệu</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 font-semibold">
              Đang hoạt động
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1220] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500 font-medium">Mã giới thiệu</p>
                <p className="text-sm font-bold text-white truncate max-w-[180px]">
                  {referralCode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-300" />
                )}
                {copied ? "Đã copy" : "Copy"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {[
              {
                label: "Người xếp hạng tháng",
                value:
                  loadingReferral
                    ? "Đang tải..."
                    : referral?.monthlyRank
                      ? `Top #${referral.monthlyRank}`
                      : "Chưa xếp hạng",
              },
              {
                label: "Hoa hồng giới thiệu",
                value: `Từ ${Math.round((referral?.commissionRate || 0.1) * 100)}%`,
              },
              {
                label: "Đã liên kết",
                value:
                  loadingReferral
                    ? "Đang tải..."
                    : `${referral?.totalReferrals || 0} lượt`,
              },
              {
                label: "Đã thưởng",
                value:
                  loadingReferral
                    ? "Đang tải..."
                    : `${referral?.rewardedReferrals || 0} lượt`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                <span className="text-xs text-gray-200 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1220] p-3">
            {referral?.campaign?.enabled && (
              <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                <p className="text-xs font-semibold text-white">
                  {referral.campaign.title || "Cập nhật referral"}
                </p>
                <p className="mt-2 text-[11px] text-cyan-50/90 leading-relaxed whitespace-pre-line break-words">
                  {referral.campaign.message}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 font-medium mb-2">Kích hoạt mã giới thiệu</p>
            {referral?.referredBy ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 font-medium">
                Đã liên kết với {referral.referredBy.username} ({referral.referredBy.code})
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    value={referralInput}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã referral"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleApplyReferral}
                    disabled={submittingReferral}
                    className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/15 transition disabled:opacity-50"
                  >
                    {submittingReferral ? "Đang lưu" : "Áp dụng"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                  Mỗi tài khoản chỉ nhập mã một lần. Người được giới thiệu sẽ được ghi nhận ngay, còn hoa hồng chỉ cộng khi topup thành công.
                </p>
              </>
            )}
            {referralError && (
              <p className="mt-2 text-xs text-rose-300 font-medium">{referralError}</p>
            )}
            {referralSuccess && (
              <p className="mt-2 text-xs text-emerald-300 font-medium">{referralSuccess}</p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b1220] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Thu nhập referral</p>
              <span className="text-xs font-semibold text-cyan-300">
                {(referral?.totalReward || 0).toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>Đang chờ topup để nhận thưởng</span>
              <span>{loadingReferral ? "..." : `${referral?.pendingReferrals || 0} lượt`}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {loadingReferral ? (
                <p className="text-xs text-gray-500">Đang tải lịch sử...</p>
              ) : referral?.history?.length ? (
                referral.history.slice(0, 3).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-white">
                        {item.username || `User ${item.referredUserId}`}
                      </p>
                      {item.status === "topup_rewarded" ? (
                        <p className="text-[11px] text-gray-500">
                          Nạp {Number(item.sourceAmount || 0).toLocaleString("vi-VN")}đ
                        </p>
                      ) : item.status === "linked_rewarded" ? (
                        <p className="text-[11px] text-cyan-300/80">
                          Thưởng liên kết đã cộng
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-300/80">
                          Đã liên kết, chưa topup
                        </p>
                      )}
                    </div>
                    {item.status === "topup_rewarded" ? (
                      <span className="text-xs font-semibold text-emerald-300">
                        +{Number(item.totalRewardAmount || item.rewardAmount || 0).toLocaleString("vi-VN")}đ
                      </span>
                    ) : item.status === "linked_rewarded" ? (
                      <span className="text-xs font-semibold text-emerald-300">
                        +{Number(item.totalRewardAmount || item.rewardAmount || 0).toLocaleString("vi-VN")}đ
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-300">
                        Chờ thưởng
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  Chưa có ai liên kết mã hoặc chưa có topup nào phát sinh hoa hồng.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 h-px bg-white/10" />

          <div className="mt-4 grid gap-1.5">
            {MENU_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition"
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
