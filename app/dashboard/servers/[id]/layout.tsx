"use client";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { FileText, PanelTop, Settings, TerminalSquare, Users, Zap } from "lucide-react";

const NAV = [
  {
    href: "",
    label: "Console",
    desc: "Nhật ký & lệnh",
    icon: TerminalSquare,
  },
  {
    href: "/files",
    label: "Files",
    desc: "Quản lý source",
    icon: FileText,
  },
  {
    href: "/startup",
    label: "Startup",
    desc: "Lệnh khởi chạy",
    icon: Zap,
  },
  {
    href: "/users",
    label: "Users",
    desc: "Quyền truy cập",
    icon: Users,
  },
  {
    href: "/settings",
    label: "Settings",
    desc: "Cấu hình bot",
    icon: Settings,
  },
];

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const pathname = usePathname() || "";
  const base = `/dashboard/servers/${id}`;

  const isActive = (suffix: string) => {
    const full = base + suffix;
    if (suffix === "") return pathname === base;
    return pathname.startsWith(full);
  };

  return (
    <div className="flex bg-[#030712] h-full min-h-0 overflow-hidden text-gray-200">
      <aside className="w-65 border-r border-white/5 bg-[#030712] flex flex-col h-full shrink-0 overflow-hidden">
        <div className="h-20 flex items-center gap-4 px-6 border-b border-white/5">
          <div className="relative">
            <div className="absolute -inset-1 bg-linear-to-r from-cyan-500/40 to-blue-500/40 rounded-2xl blur opacity-50" />
            <div className="relative w-11 h-11 rounded-2xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center shadow-2xl">
              <PanelTop className="w-5 h-5 text-cyan-300" />
            </div>
          </div>
          <div>
            <p className="font-extrabold text-white text-base tracking-tight leading-none">
              Server Control
            </p>
            <p className="text-[11px] text-cyan-400/80 font-semibold tracking-wider uppercase mt-1">
              Console Suite
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-white/5">
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1c] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Server ID
            </p>
            <p className="mt-2 text-sm font-mono text-white tracking-widest">
              {id?.substring(0, 8).toUpperCase()}
            </p>
            <Link
              href="/dashboard/hosting"
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 hover:bg-cyan-500/20 transition"
            >
              Quay lại Hosting
            </Link>
          </div>
        </div>

        <nav className="flex-1 overflow-hidden py-6 px-4 space-y-2">
          <div className="px-3 pb-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Menu quản trị
            </p>
          </div>
          {NAV.map(({ href, label, desc, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={label}
                href={`${base}${href}`}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden ${
                  active
                    ? "bg-white/4 text-white border border-cyan-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/3 border border-transparent"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-cyan-400 rounded-r-full shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
                )}
                <Icon
                  className={`w-4 h-4 ${
                    active ? "text-cyan-300" : "text-gray-500 group-hover:text-cyan-200"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-[11px] text-gray-500">{desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
        <div className="absolute top-0 right-0 w-125 h-125 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/3 w-175 h-95 bg-cyan-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />

        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-white/1 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
              <TerminalSquare className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Server Console
              </p>
              <p className="text-xs font-black text-white leading-none">
                {id?.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="bg-[#0a0f1c] border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] font-mono text-gray-400 font-bold tracking-wider">
              {id?.substring(0, 8)}
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="max-w-screen-2xl mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
