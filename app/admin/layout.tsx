import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import {
  CreditCard,
  LayoutGrid,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

const ADMIN_NAV = [
  {
    href: '/admin',
    label: 'Tổng quan',
    desc: 'Bức tranh hệ thống',
    icon: LayoutGrid,
  },
  {
    href: '/admin/users',
    label: 'Người dùng',
    desc: 'Quyền & tài khoản',
    icon: Users,
  },
  {
    href: '/admin/deployments',
    label: 'Triển khai',
    desc: 'Bot & container',
    icon: Rocket,
  },
  {
    href: '/admin/billing',
    label: 'Thanh toán',
    desc: 'Gói & doanh thu',
    icon: CreditCard,
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return redirect('/');
  
  await connectToDatabase();
  const _user = await User.findOne({ email: session.user.email });
  if (_user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#07090f] text-white">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-3xl font-black text-red-400 mb-3">Truy cập bị từ chối</h1>
        <p className="text-gray-400 mb-8">Bạn không có quyền Admin để xem trang này.</p>
        <Link href="/dashboard" className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-500/20 transition-all">
          ← Quay về Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex bg-[#030712] text-gray-200 min-h-screen font-sans antialiased selection:bg-cyan-500/30">
      <aside className="w-[260px] border-r border-white/5 bg-[#030712] flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 z-40 relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-red-500/10 blur-[60px] -z-10 pointer-events-none" />

        <div className="h-20 flex items-center gap-4 px-6 border-b border-white/5 z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-40 transition duration-500" />
            <div className="relative w-11 h-11 rounded-2xl bg-[#0a0f1c] border border-white/10 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="w-5 h-5 text-red-300" />
            </div>
          </div>
          <div>
            <p className="font-extrabold text-white text-base tracking-tight leading-none">
              Admin Core
            </p>
            <p className="text-[11px] text-red-400/80 font-semibold tracking-wider uppercase mt-1">
              Restricted Access
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-white/5 z-10">
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1c] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Điều khiển nhanh
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex-1 text-center text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg py-2 hover:bg-cyan-500/20 transition"
              >
                User UI
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
                title="Cài đặt"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 z-10 custom-scrollbar">
          <div className="px-3 pb-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Menu quản trị
            </p>
          </div>
          {ADMIN_NAV.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden text-gray-400 hover:text-white hover:bg-white/[0.03]"
            >
              <Icon className="w-4 h-4 text-red-300 group-hover:text-red-200" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-[11px] text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-red-500/5 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[380px] bg-orange-500/5 blur-[160px] rounded-full pointer-events-none -z-10" />

        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.01] backdrop-blur-xl shrink-0 sticky top-0 z-30">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              Admin Workspace
            </p>
            <h1 className="text-lg font-black text-white">Bảng điều hành</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              Quyền quản trị
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
