"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Server,
  Clock,
  Activity,
  ArrowRight,
  Zap,
  Box,
  TerminalSquare,
  History,
} from "lucide-react";

function getRemainingDays(expiresAt?: string | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

export default function DashboardHome() {
  const [hosting, setHosting] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => {
        setHosting(data.hosting);
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
        setDaysLeft(getRemainingDays(data.hosting?.expiresAt ?? null));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const planColor: Record<string, string> = {
    free: "text-gray-300 drop-shadow-[0_0_5px_rgba(209,213,219,0.5)]",
    basic: "text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]",
    pro: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]",
    premium: "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]",
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both pb-10">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-6 pt-4">
        <div className="relative z-10">
          <div className="absolute -inset-4 bg-cyan-500/20 blur-[50px] -z-10" />
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400 tracking-tighter mb-2 drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Tổng quan hệ thống
          </p>
        </div>
        {!hosting && (
          <Link
            href="/dashboard/store"
            className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl overflow-hidden font-bold transition-all hover:scale-105 duration-300"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -inset-full w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine duration-1000" />
            <div className="absolute inset-0 w-full h-full rounded-xl border border-white/20" />
            <Zap className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_5px_yellow] relative z-10" />
            <span className="text-white relative z-10 font-black tracking-wide drop-shadow-md">
              Tạo Cloud Bot
            </span>
          </Link>
        )}
      </div>

      {/* Stats Row Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="group relative bg-[#0a0f1c]/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 hover:border-cyan-500/30 transition-all duration-500 overflow-hidden shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 blur-[40px] rounded-full group-hover:bg-cyan-500/20 transition-colors duration-500" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-6 h-6 text-cyan-400" />
              </div>
              <Link
                href="/dashboard/topup"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 transition-colors"
              >
                Nạp thêm
              </Link>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2">
                Số dư BotCoin
              </p>
              <p className="text-4xl font-black text-white tracking-tighter">
                {loading ? "—" : `${balance.toLocaleString("vi-VN")}`}
                <span className="text-xl text-cyan-500 ml-1">₫</span>
              </p>
            </div>
          </div>
        </div>

        {/* Hosting Plan Card */}
        <div className="group relative bg-[#0a0f1c]/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-500" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)] group-hover:scale-110 transition-transform duration-500">
                <Server className="w-6 h-6 text-indigo-400" />
              </div>
              {hosting && (
                <Link
                  href="/dashboard/hosting"
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 transition-colors"
                >
                  Console
                </Link>
              )}
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2">
                Gói Server
              </p>
              <p
                className={`text-3xl font-black capitalize tracking-tight ${hosting ? planColor[hosting.planId] : "text-gray-500"}`}
              >
                {loading ? "—" : hosting ? hosting.planId : "Unallocated"}
              </p>
            </div>
          </div>
        </div>

        {/* Time Left Card */}
        <div className="group relative bg-[#0a0f1c]/80 backdrop-blur-md rounded-3xl border border-white/5 p-6 hover:border-green-500/30 transition-all duration-500 overflow-hidden shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute right-0 top-0 w-32 h-32 bg-green-500/10 blur-[40px] rounded-full group-hover:bg-green-500/20 transition-colors duration-500" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.15)] group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase py-1 px-2 border border-white/5 bg-white/5 rounded-md">
                Status
              </span>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2">
                Thời gian sử dụng
              </p>
              <p
                className={`text-4xl font-black tracking-tighter ${daysLeft !== null && daysLeft <= 7 ? "text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" : "text-white"}`}
              >
                {loading ? (
                  "—"
                ) : daysLeft !== null ? (
                  <>
                    {daysLeft}{" "}
                    <span className="text-xl text-gray-500 tracking-normal font-bold">
                      Ngày
                    </span>
                  </>
                ) : (
                  <span className="text-3xl text-gray-600">N/A</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Area: Hosting Preview & Prompts */}
        <div className="lg:col-span-2 space-y-6 self-start">
          {!loading && !hosting && (
            <div className="relative bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/5 hover:border-cyan-500/20 transition-all duration-500 rounded-3xl p-10 flex flex-col items-center text-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] mb-6 animate-float relative z-10">
                <Box className="w-10 h-10 text-cyan-400 drop-shadow-lg" />
              </div>
              <h3 className="text-2xl text-white font-black mb-3 tracking-tight relative z-10">
                Bạn chưa có Server Game/Bot
              </h3>
              <p className="text-gray-400 font-medium text-sm mb-8 max-w-sm leading-relaxed relative z-10">
                Mua Cloud Hosting cao cấp chuẩn NVMe. Cài đặt tự động, chạy ngay
                trong 30 giây với giao diện Console chuyên nghiệp nhất.
              </p>

              <Link
                href="/dashboard/store"
                className="relative group inline-flex items-center gap-2 bg-white/5 border border-white/10 text-cyan-400 font-bold px-8 py-3.5 rounded-full hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all text-sm z-10"
              >
                <span>Khám phá Gói Cloud</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}

          {!loading && hosting && (
            <div className="group relative bg-[#0a0f1c]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden hover:border-cyan-500/30 transition-all duration-500 shadow-2xl shadow-black/40 flex flex-col self-start">
              {/* Top Gradient Bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 opacity-80" />

              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      Active App
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse bg-glow" />
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-wide">
                      Online
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 flex-1">
                  <div className="flex items-center gap-6">
                    <div className="relative group flex-shrink-0">
                      <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="w-20 h-20 rounded-full bg-[#030712] border-2 border-white/10 flex items-center justify-center text-4xl relative z-10 shrink-0">
                        🚀
                      </div>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md mb-2">
                        {hosting.botName || "Chưa định danh"}
                      </h2>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                          Node: VN-HCM-1
                        </span>
                        <span
                          className={`px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-wide ${planColor[hosting.planId] || "text-gray-400"}`}
                        >
                          Tiers: {hosting.planId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/hosting"
                    className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 bg-[#030712] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-white font-bold rounded-xl transition-all shadow-lg shrink-0 mt-4 sm:mt-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shine" />
                    Quản lý Server{" "}
                    <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Space: Recent Transactions */}
        <div className="lg:col-span-1 self-start">
          <div className="bg-[#0a0f1c]/80 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden flex flex-col hover:border-white/10 transition-colors duration-500 max-h-[720px]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em]">
                  Lịch sử giao dịch
                </h2>
              </div>
              <Link
                href="/dashboard/history"
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-2 py-1 rounded-md"
              >
                Tất cả
              </Link>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-white/5 rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                <Wallet className="w-10 h-10 text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm font-semibold">
                  Chưa có giao dịch nào
                </p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Lịch sử thu chi sẽ hiện ở đây
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 overflow-y-auto custom-scrollbar flex-1 p-2">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx._id}
                    className="p-4 flex justify-between items-center group hover:bg-white/[0.02] rounded-2xl transition-colors m-1"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border shadow-inner ${
                          tx.amount > 0
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}
                      >
                        {tx.amount > 0 ? "+₫" : "-₫"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium tracking-wide mt-1 uppercase">
                          {new Date(tx.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          •{" "}
                          {new Date(tx.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-black text-sm whitespace-nowrap bg-white/5 px-2 py-1 rounded-md ${tx.amount > 0 ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-red-400"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
