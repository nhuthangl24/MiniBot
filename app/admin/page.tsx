import { connectToDatabase } from '@/lib/db';
import Deployment from '@/models/Deployment';
import { User } from '@/models/User';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminNotificationPanel } from '@/components/admin/AdminNotificationPanel';
import { AdminReferralSettingsPanel } from '@/components/admin/AdminReferralSettingsPanel';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const userSession = session?.user as any;
  
  if (!session || userSession?.role !== 'admin') {
    redirect('/dashboard');
  }

  await connectToDatabase();
  const totalUsers = await User.countDocuments();
  const totalDeployments = await Deployment.countDocuments();
  const activeDeployments = await Deployment.countDocuments({ status: 'running' });
  const failedDeployments = await Deployment.countDocuments({ status: 'failed' });

  const allRunning = await Deployment.find({ status: 'running' }).lean();
  const recentDeployments = await Deployment.find().sort({ createdAt: -1 }).limit(10).lean();

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">Bảng Quản Trị</h1>
          <p className="text-gray-400 text-sm">Tổng quan hệ thống MiniBot</p>
        </div>
        <div className="flex items-center gap-3 bg-red-500/10 px-5 py-2.5 rounded-full border border-red-500/20">
          <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          <span className="text-sm text-red-400 font-bold">Admin Access</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Người Dùng', value: totalUsers, color: 'text-indigo-400', icon: '👥', bg: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20' },
          { label: 'Tổng Deployments', value: totalDeployments, color: 'text-white', icon: '🚀', bg: 'from-white/5 to-white/[0.02] border-white/10' },
          { label: 'Đang Chạy', value: activeDeployments, color: 'text-green-400', icon: '✅', bg: 'from-green-500/10 to-green-600/5 border-green-500/20' },
          { label: 'Thất Bại', value: failedDeployments, color: 'text-red-400', icon: '❌', bg: 'from-red-500/10 to-red-600/5 border-red-500/20' },
        ].map(({ label, value, color, icon, bg }) => (
          <div key={label} className={`bg-gradient-to-br ${bg} border rounded-2xl p-6 flex flex-col gap-3`}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Containers */}
      <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/[0.05] flex justify-between items-center">
          <h2 className="text-lg font-black text-white">Container Đang Chạy ({activeDeployments})</h2>
          <span className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${activeDeployments > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
            {activeDeployments > 0 ? <><span className="dot-online"></span>Live</> : 'Trống'}
          </span>
        </div>
        <div className="p-6">
          {allRunning.length === 0 ? (
            <div className="text-gray-600 py-10 text-center text-sm">Không có container nào đang chạy.</div>
          ) : (
            <div className="space-y-3">
              {allRunning.map((d: any) => (
                <div key={d._id.toString()} className="flex justify-between items-center bg-white/[0.03] border border-white/[0.05] p-4 rounded-xl hover:border-white/10 transition-all">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="dot-online"></span>
                      <span className="font-bold text-white">{d.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{d.containerId?.substring(0, 12) || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-gray-500 ml-5">Owner: {d.userId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-gray-400 font-mono">{d.image}</span>
                    <Link
                      href={`/dashboard/servers/${d.containerId || d._id}`}
                      className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      Console →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Deployments */}
      <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/[0.05]">
          <h2 className="text-lg font-black text-white">Deployments Gần Đây</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] text-gray-500 text-xs font-bold uppercase tracking-widest">
                <th className="text-left p-4">Tên Bot</th>
                <th className="text-left p-4">User ID</th>
                <th className="text-left p-4">Image</th>
                <th className="text-center p-4">Status</th>
                <th className="text-right p-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentDeployments.map((d: any) => {
                const statusColors: Record<string, string> = {
                  running: 'text-green-400 bg-green-500/10 border-green-500/20',
                  stopped: 'text-red-400 bg-red-500/10 border-red-500/20', 
                  deploying: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                  failed: 'text-red-500 bg-red-600/10 border-red-600/20',
                };
                return (
                  <tr key={d._id.toString()} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">{d.name}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{d.userId?.substring(0, 16)}...</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{d.image}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusColors[d.status] || statusColors.stopped}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-500 text-xs">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AdminNotificationPanel />
      <AdminReferralSettingsPanel />
    </div>
  );
}
