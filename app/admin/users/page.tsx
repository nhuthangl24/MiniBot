import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export default async function AdminUsersPage() {
  await connectToDatabase();
  const users = await User.find({}).sort({ createdAt: -1 });

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Danh sách Người dùng</h1>
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-4xl">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 border-b border-white/10">
              <th className="pb-3 text-sm">Discord ID</th>
              <th className="pb-3 text-sm">Tên</th>
              <th className="pb-3 text-sm">Email</th>
              <th className="pb-3 text-sm">Vai trò</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id.toString()} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="py-4 font-mono text-sm">{u.discordId}</td>
                <td className="py-4 font-bold">{u.username}</td>
                <td className="py-4 text-gray-400">{u.email || 'N/A'}</td>
                <td className="py-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-300'}`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
