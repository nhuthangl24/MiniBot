export default function TopUpPage() {
    return (
      <div className="max-w-6xl mx-auto">
         <header className="mb-10">
            <h1 className="text-[32px] font-black tracking-tight text-white mb-1">Nạp tiền vào tài khoản</h1>
            <p className="text-gray-400 text-[15px]">Nạp tiền để gia hạn và mua các dịch vụ mới</p>
         </header>

         {/* Main Content Card */}
         <div className="bg-[#121c2c] border border-white/[0.03] rounded-[2rem] p-10 shadow-2xl overflow-hidden max-w-4xl mx-auto mt-16">
             <div className="max-w-2xl mx-auto">
                 {/* Tabs */}
                 <div className="flex bg-[#192436] rounded-2xl p-1.5 mb-10 w-full relative z-10 border border-white/5">
                     <button className="flex-1 bg-[#4f5ee3] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all text-sm tracking-wide">
                        VietQR / Chuyển khoản
                     </button>
                     <button className="flex-1 text-gray-400 font-bold py-3.5 rounded-xl hover:text-white transition-all text-sm tracking-wide">
                        Nạp thẻ cào
                     </button>
                 </div>

                 {/* Presets */}
                 <div className="grid grid-cols-3 gap-4 mb-8">
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         2.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         5.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         10.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         20.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         50.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                     <button className="py-4 rounded-2xl bg-[#172233] border border-white/5 hover:border-indigo-500/50 transition-all text-white font-bold tracking-wider hover:bg-[#1a263c]">
                         100.000 <span className="underline ml-0.5 text-sm text-gray-400">đ</span>
                     </button>
                 </div>

                 {/* Custom Input */}
                 <div className="mb-8">
                     <label className="block text-[13px] font-bold text-gray-300 mb-3 tracking-wider">Hoặc nhập số tiền</label>
                     <input 
                         type="text" 
                         placeholder="Tối thiểu 2.000 đ" 
                         className="w-full bg-[#172233] border border-white/5 rounded-2xl px-6 py-5 text-white outline-none focus:border-indigo-500 transition-colors font-medium placeholder-gray-600"
                     />
                 </div>

                 {/* Submit */}
                 <button className="w-full bg-[#3d4bb5] hover:bg-[#4f5ee3] text-white font-bold text-[15px] py-5 rounded-2xl transition-colors shadow-lg tracking-wide border border-indigo-400/20 group flex justify-center items-center gap-2">
                    Tiếp tục thanh toán
                 </button>
             </div>
         </div>
      </div>
    )
  }
