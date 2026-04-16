'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPlanCpu, formatPlanDisk, formatPlanRam } from '@/lib/planConfig';

const STATUS_CONFIG = {
  running: { label: 'Đang chạy', dotClass: 'dot-online', textColor: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  stopped: { label: 'Đã dừng', dotClass: 'dot-offline', textColor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  deploying: { label: 'Đang triển khai', dotClass: 'dot-deploying', textColor: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  idle: { label: 'Chưa khởi động', dotClass: 'dot-offline', textColor: 'text-gray-400', bg: 'bg-white/[0.04]', border: 'border-white/10' },
};

function getRemainingDays(expiresAt?: string | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

export default function HostingPage() {
  const [hosting, setHosting] = useState<any>(null);
  const [sharedHostings, setSharedHostings] = useState<any[]>([]);
  const [, setBalance] = useState(0);
  const [containerStatuses, setContainerStatuses] = useState<Record<string, 'running' | 'stopped' | 'deploying' | 'idle'>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState<Record<string, number | null>>({});

  const loadData = async () => {
    try {
      const data = await fetch('/api/orders').then(r => r.json());
      setHosting(data.hosting);
      setSharedHostings(Array.isArray(data.sharedHostings) ? data.sharedHostings : []);
      setBalance(data.balance || 0);

      const hostings = [data.hosting, ...(Array.isArray(data.sharedHostings) ? data.sharedHostings : [])].filter(Boolean);
      setDaysLeft(
        Object.fromEntries(
          hostings.map((item: any) => [item._id, getRemainingDays(item?.expiresAt ?? null)]),
        ),
      );

      const nextStatuses: Record<string, 'running' | 'stopped' | 'deploying' | 'idle'> = {};
      await Promise.all(
        hostings.map(async (item: any) => {
          if (!item?.containerId) {
            nextStatuses[item._id] = 'idle';
            return;
          }
          try {
            const statusRes = await fetch(`/api/servers/${item.containerId}/status`).then(r => r.json());
            nextStatuses[item._id] = statusRes.status === 'running' ? 'running' : 'stopped';
          } catch {
            nextStatuses[item._id] = 'idle';
          }
        }),
      );
      setContainerStatuses(nextStatuses);
    } catch {
      setContainerStatuses({});
    }
    setLoading(false);
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadData();
    }, 0);
    const interval = window.setInterval(() => {
      void loadData();
    }, 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  const handleAction = async (hostingId: string, action: 'start' | 'stop' | 'restart') => {
    if (!hostingId) return;
    setActionLoading(`${hostingId}:${action}`);
    try {
      await fetch(`/api/servers/${hostingId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setTimeout(loadData, 1000);
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const hostingCards = [hosting, ...sharedHostings].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Hosting của tôi</h1>
          <p className="text-gray-400 text-sm">Mỗi tài khoản có 1 slot hosting duy nhất</p>
        </div>
        <Link href="/dashboard/store" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 px-4 py-2 rounded-xl transition-all">
           Nâng cấp gói
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl h-56 loading-shimmer" />
        </div>
      )}

      {/* No plan */}
      {!loading && !hosting && (
        <div className="border-2 border-dashed border-white/[0.06] rounded-3xl p-16 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center mb-6 border border-white/[0.06] text-4xl">
            📦
          </div>
          <h3 className="text-xl font-black text-white mb-2">Bạn chưa có gói hosting</h3>
          <p className="text-gray-500 text-sm mb-8 max-w-sm">Mua gói để nhận 1 slot hosting riêng. Sau đó upload file bot trực tiếp trong panel.</p>
          <Link href="/dashboard/store" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black px-8 py-3 rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5">
            Xem bảng giá →
          </Link>
        </div>
      )}

      {/* Hosting slot exists */}
      {!loading && hostingCards.length > 0 && (
        <div className="space-y-5">
          {/* Main Card */}
          {hostingCards.map((item: any) => {
            const statusCfg = STATUS_CONFIG[containerStatuses[item._id] || 'idle'];
            const isShared = Boolean(item.isShared);
            const permissionList = Array.isArray(item.sharedAccess?.permissions) ? item.sharedAccess.permissions : [];
            const canStart = !isShared || permissionList.includes('power:start');
            const canStop = !isShared || permissionList.includes('power:stop');
            const canRestart = !isShared || permissionList.includes('power:restart');
            const canOpenConsole = !isShared || permissionList.includes('console:view');

            return (
              <div key={item._id} className="bg-[#0b0e1a] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 w-full" />

                <div className="p-6 flex flex-col sm:flex-row gap-6">
                  <div className="flex gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl shrink-0">
                      {isShared ? '🫂' : '🤖'}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <h2 className="text-lg font-black text-white">
                          {item.botName || (isShared ? 'Hosting được chia sẻ' : 'Bot của bạn')}
                        </h2>
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.textColor} ${statusCfg.bg} ${statusCfg.border}`}>
                          <span className={statusCfg.dotClass} style={{ width: 6, height: 6 }}></span>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 capitalize">
                          Gói {item.planId}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${isShared ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                          {isShared ? 'Shared Access' : 'Owner'}
                        </span>
                      </div>
                      {item.containerId ? (
                        <p className="text-xs text-gray-500 font-mono">Container: {item.containerId.substring(0, 16)}...</p>
                      ) : (
                        <p className="text-xs text-yellow-500/70 font-medium">⚠ Chưa có container — Upload file và khởi động để bắt đầu</p>
                      )}
                      {item.expiresAt && (
                        <p className="text-xs text-gray-600 mt-1">
                          Hết hạn: {new Date(item.expiresAt).toLocaleDateString('vi-VN')}
                          {' · '}
                          Còn {daysLeft[item._id] ?? 0} ngày
                        </p>
                      )}
                      {isShared && permissionList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {permissionList.map((permission: string) => (
                            <span
                              key={permission}
                              className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:w-72 shrink-0">
                    {[
                      { label: 'RAM', value: formatPlanRam(item.planId), color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-600/5 border-purple-500/15' },
                      { label: 'CPU', value: formatPlanCpu(item.planId), color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5 border-blue-500/15' },
                      { label: 'Disk', value: formatPlanDisk(item.planId), color: 'text-teal-400', bg: 'from-teal-500/10 to-teal-600/5 border-teal-500/15' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`bg-gradient-to-br ${bg} border rounded-xl p-3 text-center`}>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</p>
                        <p className={`font-black text-sm ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/[0.05] p-4 flex flex-wrap gap-2.5 bg-white/[0.02]">
                  <button
                    onClick={() => handleAction(item.containerId, 'start')}
                    disabled={containerStatuses[item._id] === 'running' || !!actionLoading || !item.containerId || !canStart}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {actionLoading === `${item.containerId}:start` ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                    ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                    )}
                    Start
                  </button>

                  <button
                    onClick={() => handleAction(item.containerId, 'restart')}
                    disabled={containerStatuses[item._id] !== 'running' || !!actionLoading || !canRestart}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Restart
                  </button>

                  <button
                    onClick={() => handleAction(item.containerId, 'stop')}
                    disabled={containerStatuses[item._id] !== 'running' || !!actionLoading || !canStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Stop
                  </button>

                  {item.containerId && canOpenConsole && (
                    <Link
                      href={`/dashboard/servers/${item.containerId}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 font-bold text-sm transition-all ml-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M4 15h16M4 9h16" />
                      </svg>
                      Mở Console →
                    </Link>
                  )}

                  {!item.containerId && !isShared && (
                    <Link
                      href={`/dashboard/servers/setup`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 font-bold text-sm transition-all ml-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Khởi tạo Container →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📂', label: 'Quản lý Files', desc: 'Upload, chỉnh sửa file bot', href: hosting?.containerId ? `/dashboard/servers/${hosting.containerId}/files` : '#', disabled: !hosting?.containerId },
              { icon: '⚙️', label: 'Cấu hình Startup', desc: 'Lệnh chạy bot & môi trường', href: hosting?.containerId ? `/dashboard/servers/${hosting.containerId}/startup` : '#', disabled: !hosting?.containerId },
              { icon: '💳', label: 'Nâng cấp gói', desc: 'Tăng RAM, CPU, SSD', href: '/dashboard/store', disabled: hosting?.planId === 'premium' },
            ].map(({ icon, label, desc, href, disabled }) => (
              <Link
                key={label}
                href={disabled ? '#' : href}
                className={`bg-[#0b0e1a] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 transition-all ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/10 hover:-translate-y-0.5'
                }`}
                onClick={disabled ? (e) => e.preventDefault() : undefined}
              >
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
