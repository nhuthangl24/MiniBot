'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function History() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        setTransactions(data.transactions || []);
        setBalance(data.balance || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl w-full mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">Lịch sử giao dịch</h1>
          <p className="text-gray-400 text-sm">Toàn bộ biến động số dư tài khoản</p>
        </div>
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-xl px-5 py-3 text-right">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Số dư hiện tại</p>
          <p className="text-xl font-black text-cyan-400">{balance.toLocaleString('vi-VN')} đ</p>
        </div>
      </div>

      <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/[0.03] text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-white/[0.05]">
              <tr>
                <th className="p-5">Mô tả</th>
                <th className="p-5 text-center">Ngày giao dịch</th>
                <th className="p-5 text-right">Số tiền</th>
                <th className="p-5 text-right">Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && (
                <tr><td colSpan={4} className="p-12 text-center text-gray-600">Đang tải...</td></tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-4xl">📭</span>
                      <p className="text-gray-500 font-medium">Chưa có giao dịch nào</p>
                      <Link href="/dashboard/topup" className="text-cyan-400 text-sm font-bold hover:text-cyan-300 transition-colors">Nạp tiền ngay →</Link>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && transactions.map((tx) => {
                const typeConfig: Record<string, { label: string, color: string }> = {
                  topup: { label: 'Nạp tiền', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
                  purchase: { label: 'Mua gói', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  upgrade: { label: 'Nâng cấp', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                  manual_credit: { label: 'Cộng tay', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
                  referral_link_bonus: { label: 'Thưởng link', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
                  referral_bonus: { label: 'Hoa hồng', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20' },
                };
                const cfg = typeConfig[tx.type] || { label: tx.type, color: 'text-gray-400 bg-white/5 border-white/10' };

                return (
                  <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{tx.amount > 0 ? '💰' : '🛍️'}</span>
                        <div>
                          <p className="text-white font-bold">{tx.description}</p>
                          <p className="text-xs text-gray-600 font-mono mt-0.5">#{tx._id?.substring?.(0, 12)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <p className="text-gray-300 font-medium">{new Date(tx.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</p>
                    </td>
                    <td className="p-5 text-right">
                      <span className={`font-black whitespace-nowrap ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-white/[0.05]">
          {transactions.map((tx) => (
            <div key={tx._id} className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-lg">{tx.amount > 0 ? '💰' : '🛍️'}</span>
                <div>
                  <p className="text-white font-bold text-sm">{tx.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <span className={`font-black text-sm whitespace-nowrap ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
