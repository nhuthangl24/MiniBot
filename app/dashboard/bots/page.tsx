"use client"
import { useEffect, useState } from 'react'

export default function BotList() {
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/deployments')
      .then(res => res.json())
      .then(data => {
        setBots(data.deployments || [])
        setLoading(false)
      })
      .catch(console.error)
  }, [])

  const handleAction = async (id: string, action: string) => {
    if (action === 'delete' && !confirm('Bạn chắc chắn muốn xoá bot này khỏi thiết bị?')) return;
    
    try {
      const res = await fetch(`/api/deployments/${id}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        if (action === 'delete') {
          setBots(bots.filter(b => b._id !== id))
        } else {
          const { status } = await res.json()
          setBots(bots.map(b => b._id === id ? { ...b, status } : b))
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-6xl space-y-12 animate-in fade-in duration-500">
      <header className="flex justify-between items-end pb-8 border-b border-white/5">
        <div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">Bot Của Tôi</h1>
          <p className="text-gray-400 text-lg">Danh sách và trạng thái triển khai bot.</p>
        </div>
        <a href="/dashboard/deploy" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all transform hover:-translate-y-1">
          + THÊM BOT MỚI
        </a>
      </header>

      {loading && <p className="text-white">Đang tải thông tin bot...</p>}

      {!loading && bots.length === 0 && (
         <div className="bg-[#0a1128] border border-white/10 rounded-3xl p-12 text-center">
            <h3 className="text-2xl text-white font-bold mb-4">Bạn chưa khởi chạy Bot nào!</h3>
            <a href="/dashboard/deploy" className="text-cyan-400 hover:underline">Hãy bắt đầu tạo ứng dụng đầu tiên.</a>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {bots.map((bot) => (
            <div key={bot._id} className="bg-[#0a1128] border border-white/10 rounded-3xl p-8 hover:border-cyan-500/30 transition-colors shadow-2xl relative overflow-hidden group">
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">{bot.name}</h2>
                        <a href={bot.repoUrl} target="_blank" className="text-sm text-cyan-400 hover:underline">
                            {bot.repoUrl?.replace('https://github.com/', '')}
                        </a>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                        bot.status === 'running' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        bot.status === 'deploying' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        bot.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-white/5 text-gray-400 border-white/10'
                    }`}>
                        ● {bot.status?.toUpperCase()}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-white/5 rounded-2xl p-4">
                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Môi trường</p>
                        <p className="text-white font-mono text-lg">{bot.image}</p>
                     </div>
                     <div className="bg-white/5 rounded-2xl p-4">
                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Cấu hình Limit</p>
                        <p className="text-white font-mono text-lg">1 GB <span className="text-sm text-gray-400">/ 1 vCPU</span></p>
                     </div>
                </div>

                <div className="flex gap-3">
                    {bot.status === 'stopped' || bot.status === 'failed' ? (
                       <button onClick={() => handleAction(bot._id, 'start')} className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium py-3 rounded-xl transition-colors border border-green-500/20">Start</button>
                    ) : bot.status === 'running' ? (
                       <button onClick={() => handleAction(bot._id, 'stop')} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors border border-white/10">Stop</button>
                    ) : (
                       <button disabled className="flex-1 bg-white/5 opacity-50 cursor-not-allowed text-white font-medium py-3 rounded-xl border border-white/10">Đang xử lý...</button>
                    )}
                    <button onClick={() => handleAction(bot._id, 'restart')} disabled={bot.status !== 'running'} className="flex-1 bg-white/5 disabled:opacity-50 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors border border-white/10">Restart</button>
                    <button onClick={() => handleAction(bot._id, 'delete')} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
          ))}
      </div>
    </div>
  )
}
