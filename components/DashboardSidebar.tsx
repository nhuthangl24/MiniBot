"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Server,
  ShoppingCart,
  Wallet,
  History,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/hosting", label: "Hosting", icon: Server },
  { href: "/dashboard/store", label: "Mua gói", icon: ShoppingCart },
  { href: "/dashboard/topup", label: "Nạp tiền", icon: Wallet },
  { href: "/dashboard/history", label: "Lịch sử", icon: History },
  { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.balance !== undefined) setBalance(data.balance);
      })
      .catch(() => setBalance(0));
  }, []);

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-[260px] border-r border-white/5 bg-[#030712] flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 z-40 relative">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-cyan-500/10 blur-[50px] -z-10 pointer-events-none" />

      {/* Logo */}
      <div className="h-20 flex items-center gap-4 px-6 border-b border-white/5 z-10">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500" />
          <div className="relative w-10 h-10 rounded-xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center shadow-2xl">
            <span className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent font-black tracking-tighter text-lg">
              MB
            </span>
          </div>
        </div>
        <div>
          <p className="font-extrabold text-white text-base tracking-tight leading-none">
            MiniBot
          </p>
          <p className="text-[11px] text-cyan-400/80 font-semibold tracking-wider uppercase mt-1">
            Cloud Panel
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-6 border-b border-white/5 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-40" />
            <img
              src={
                session?.user?.image ||
                "https://cdn.discordapp.com/embed/avatars/0.png"
              }
              alt="Avatar"
              className="relative w-11 h-11 rounded-xl border border-white/10 object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#030712] rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">
              {session?.user?.name || "User"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <p className="text-[11px] text-gray-400 font-medium">
                Trực tuyến
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 z-10 custom-scrollbar">
        <div className="px-3 pb-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Menu Chính
          </p>
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden ${
                active
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-100 hover:bg-white/[0.02]"
              }`}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-xl" />
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 transition-all duration-300 relative z-10 ${
                  active
                    ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                    : "text-gray-500 group-hover:text-gray-300"
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Balance Widget */}
      <div className="p-6 border-t border-white/5 z-10 flex flex-col gap-4">
        <div className="relative group overflow-hidden rounded-2xl bg-[#0a0f1c] border border-white/5 p-4 transition-all duration-300 hover:border-cyan-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 blur-[40px] rounded-full group-hover:bg-cyan-500/30 transition-colors duration-500" />

          <div className="relative z-10">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3 h-3 text-cyan-400" /> Số dư hiện tại
            </p>
            <p className="text-xl font-black text-white tracking-tight">
              {balance === null ? (
                <span className="text-gray-600 text-sm animate-pulse">
                  Đang tải...
                </span>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {balance.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-cyan-500 text-base ml-1">₫</span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all flex justify-center items-center gap-2 group shadow-lg shadow-black/20"
        >
          <svg
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
