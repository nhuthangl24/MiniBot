import { connectToDatabase } from '@/lib/db';
import Deployment from '@/models/Deployment';

export default async function AdminDeploymentsPage() {
  await connectToDatabase();
  const deployments = await Deployment.find({}).sort({ createdAt: -1 });

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Kiểm soát Tất cả Deployments</h1>
      <div className="space-y-4">
        {deployments.length === 0 ? (
          <div className="text-gray-500 text-center py-10">Chưa có bot nào được triển khai.</div>
        ) : deployments.map(d => (
          <div key={d._id.toString()} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 max-w-4xl">
            <div className="flex flex-col">
              <span className="font-bold text-lg">{d.name} <span className="text-xs font-mono text-gray-500 ml-2">{d._id.toString()}</span></span>
              <span className="text-sm text-gray-400">Chạy: {d.runtime} - Của User: {d.userId.toString()}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${d.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm font-medium capitalize">{d.status}</span>
              </div>
              <button className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-500 px-3 py-1 rounded-full font-bold">Thu hồi</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
