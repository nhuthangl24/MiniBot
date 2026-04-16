import { connectToDatabase } from '@/lib/db';
import Deployment from '@/models/Deployment';
import { formatPlanCpu, formatPlanDisk, formatPlanRam } from '@/lib/planConfig';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/');

  await connectToDatabase();
  const d = await Deployment.findById(id);

  if (!d) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">❌</span>
        <h2 className="text-xl font-black text-red-400 mb-2">Không tìm thấy Bot</h2>
        <p className="text-gray-500 text-sm">Bot không tồn tại hoặc bạn không có quyền truy cập.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${d.status === 'running' ? 'dot-online' : 'dot-offline'}`}></div>
          <h1 className="text-2xl font-black text-white">{d.name}</h1>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400 capitalize">{d.status}</span>
        </div>
        <div className="flex gap-2">
          <a href={`/dashboard/servers/${d.containerId || id}`} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold px-4 py-2 rounded-xl text-sm hover:bg-cyan-500/20 transition-all">
            Mở Console →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Cấu hình</h2>
          {[
            { label: 'Môi trường', value: d.image || d.runtime || '—' },
            { label: 'Lệnh khởi động', value: d.startCommand || d.startupCommand || '—' },
            { label: 'Container ID', value: d.containerId?.substring(0, 16) + '...' || 'Chưa có' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-white font-mono">{value}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Tài nguyên</h2>
          {[
            { label: 'RAM', value: formatPlanRam(d.planId) },
            { label: 'CPU', value: formatPlanCpu(d.planId) },
            { label: 'Disk', value: formatPlanDisk(d.planId) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="text-cyan-400 font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
