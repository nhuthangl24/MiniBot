'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ENV_OPTIONS = [
  { value: 'node:20-alpine', label: 'Node.js 20', icon: '⚡', desc: 'JavaScript runtime' },
  { value: 'node:18-alpine', label: 'Node.js 18', icon: '🟢', desc: 'LTS version' },
  { value: 'python:3.11-slim', label: 'Python 3.11', icon: '🐍', desc: 'Latest stable' },
  { value: 'python:3.10-slim', label: 'Python 3.10', icon: '🐍', desc: 'Previous stable' },
];

export default function DeployBot() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    envType: 'node:20-alpine',
    startCommand: 'npm start',
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setError('');

    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Triển khai thất bại');

      setDeploymentId(data.deploymentId);
      setTimeout(() => router.push('/dashboard/hosting'), 2000);
    } catch (err: any) {
      setError(err.message);
      setIsDeploying(false);
    }
  };

  if (deploymentId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-20 h-20 bg-green-500/15 border border-green-500/30 rounded-3xl flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Đang triển khai!</h2>
        <p className="text-gray-400 text-sm mb-2">Container đang được khởi tạo. Chuyển hướng sang Hosting...</p>
        <p className="text-xs text-cyan-400 font-mono">ID: {deploymentId}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/dashboard/hosting" className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Deploy Bot Mới</h1>
          <p className="text-gray-400 text-sm">Triển khai từ GitHub Repository của bạn</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl font-medium mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleDeploy} className="space-y-6">
        {/* App Name */}
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Tên ứng dụng <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full bg-white/[0.04] border border-white/[0.07] focus:border-cyan-500/40 focus:ring-4 focus:ring-cyan-500/10 rounded-xl px-5 py-3.5 text-white text-sm outline-none transition-all placeholder-gray-600"
            placeholder="VD: nhac-bot, modbot-v2..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          />
          <p className="text-xs text-gray-600 mt-2">Chỉ dùng chữ thường, số và dấu gạch ngang</p>
        </div>

        {/* GitHub URL */}
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            GitHub Repository URL <span className="text-red-400">*</span>
          </label>
          <div className="flex bg-white/[0.04] border border-white/[0.07] focus-within:border-cyan-500/40 focus-within:ring-4 focus-within:ring-cyan-500/10 rounded-xl overflow-hidden transition-all">
            <div className="px-4 flex items-center bg-white/[0.03] border-r border-white/[0.06] shrink-0">
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              required
              className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm outline-none placeholder-gray-600"
              placeholder="https://github.com/user/bot-repo"
              value={formData.repoUrl}
              onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
            />
          </div>
        </div>

        {/* Environment */}
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Môi trường chạy</label>
          <div className="grid grid-cols-2 gap-3">
            {ENV_OPTIONS.map(({ value, label, icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, envType: value })}
                className={`p-4 rounded-xl text-left border transition-all ${
                  formData.envType === value
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{icon}</span>
                  <span className={`font-bold text-sm ${formData.envType === value ? 'text-cyan-300' : 'text-white'}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Start Command */}
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Lệnh Start
          </label>
          <div className="bg-white/[0.04] border border-white/[0.07] focus-within:border-cyan-500/40 rounded-xl flex items-center overflow-hidden">
            <span className="px-4 text-cyan-400 font-mono text-sm shrink-0 select-none">$</span>
            <input
              type="text"
              className="flex-1 bg-transparent py-3.5 pr-4 text-white text-sm font-mono outline-none placeholder-gray-600"
              placeholder="npm start"
              value={formData.startCommand}
              onChange={(e) => setFormData({ ...formData, startCommand: e.target.value })}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">VD: npm start | python main.py | node bot.js</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isDeploying}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-base py-4 rounded-2xl hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex justify-center items-center gap-3"
        >
          {isDeploying ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang khởi tạo container...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Triển khai ngay
            </>
          )}
        </button>
      </form>
    </div>
  );
}
