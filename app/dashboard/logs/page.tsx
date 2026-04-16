"use client"
import { useEffect, useState, useRef } from "react"
import { io } from "socket.io-client"

export default function SystemLogs() {
    const [logs, setLogs] = useState<string[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const socket = io()
        socket.on("container-log", (data) => {
            setLogs((prev) => [...prev, data])
        })
        return () => { socket.disconnect() }
    }, [])

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    return (
      <div className="max-w-6xl space-y-12">
         <header className="pb-8 border-b border-white/5 flex justify-between items-end">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2">Logs hệ thống</h1>
              <p className="text-gray-400 text-lg">Theo dõi tất cả logs từ webhook, deployment, db và traffic mạng.</p>
            </div>
             <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-xl transition-colors border border-red-500/20 font-bold text-sm">
                Xoá dòng hiển thị
             </button>
         </header>

         {/* Terminal Window */}
         <div className="bg-[#0a0f1c] rounded-[2rem] border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col font-mono text-sm leading-relaxed h-[70vh] max-h-[800px] min-h-[500px]">
            
            {/* OSX Style Header */}
            <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] h-12 px-5 flex items-center justify-between shrink-0 border-b border-white/5 relative">
              <div className="flex gap-2.5 z-10">
                 <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] shadow-[0_0_10px_rgba(255,95,86,0.6)] cursor-pointer hover:bg-[#ff4036] transition-colors flex items-center justify-center group"><svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></div>
                 <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] shadow-[0_0_10px_rgba(255,189,46,0.6)] cursor-pointer hover:bg-[#ffa710] transition-colors flex items-center justify-center group"><svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg></div>
                 <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f] shadow-[0_0_10px_rgba(39,201,63,0.6)] cursor-pointer hover:bg-[#1dbb33] transition-colors flex items-center justify-center group"><svg className="w-2 h-2 opacity-0 group-hover:opacity-100 text-black transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M3 8v6a2 2 0 002 2h10l5 5V8a2 2 0 00-2-2H5a2 2 0 00-2 2z"></path></svg></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <p className="text-gray-400 capitalize tracking-widest text-[10px] font-extrabold font-sans flex items-center gap-2">
                     <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M4 15h16M4 9h16"></path></svg>
                     root@minibot-server:~
                 </p>
              </div>
              <div className="flex gap-2 z-10">
                 <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white" title="Tải xuống Logs">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                 </button>
              </div>
            </div>

            {/* Log Stream Area */}
            <div className="p-6 flex-1 overflow-y-auto text-gray-300 min-h-0 bg-[#0a0f1c] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
               {logs.length === 0 && (
                   <div className="flex items-center gap-3 text-gray-500 font-mono text-sm">
                      <div className="w-2 h-5 bg-cyan-400 animate-pulse"></div>
                      Chưa nhận được Logs. Đang kết nối tới docker daemon...
                   </div>
               )}
               {logs.map((log, i) => (
                  <div key={i} className="mb-2 break-all hover:bg-white/5 pl-2 py-1 border-l-2 border-transparent hover:border-cyan-500/50 transition-colors group">
                     {log.split('\n').map((line, j) => {
                         const lowerLine = line.toLowerCase();
                         let colorClass = "text-[#a3b8cc]"; // Default Light Blueish Grey
                         if(lowerLine.includes('error') || lowerLine.includes('fail') || lowerLine.includes('exception')) colorClass = "text-[#ef4444]"; // React Red
                         else if(lowerLine.includes('warn')) colorClass = "text-[#f59e0b]"; // Yellow
                         else if(lowerLine.includes('info') || lowerLine.includes('success') || lowerLine.includes('ready')) colorClass = "text-[#22c55e]"; // Green
                         
                         return (
                            <p key={j} className={`${colorClass} flex gap-4`}>
                                <span className="text-gray-600 select-none shrink-0 text-xs w-36 overflow-hidden">[{new Date().toISOString().split('T')[1].replace('Z', '')}]</span> 
                                <span className="flex-1">{line}</span>
                            </p>
                         )
                     })}
                  </div>
               ))}
               <div ref={logsEndRef} className="h-4"></div>
            </div>
         </div>
      </div>
    )
  }
