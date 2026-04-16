'use client';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Settings() {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!showDangerConfirm) {
      setShowDangerConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        alert('Không thể xóa tài khoản. Vui lòng liên hệ hỗ trợ.');
      }
    } catch {
      alert('Lỗi kết nối mạng.');
    }
    setDeleting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">Cài đặt Tài khoản</h1>
        <p className="text-gray-400 text-sm">Quản lý thông tin tài khoản của bạn</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
        
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            <img
              src={session?.user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt="Avatar"
              className="w-16 h-16 rounded-2xl border-2 border-white/10"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0b0e1a] flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-black text-white">{session?.user?.name || 'Người dùng'}</h2>
            <p className="text-sm text-green-400 font-medium flex items-center gap-1.5 mt-0.5">
              <span className="dot-online"></span>
              Đang hoạt động
            </p>
          </div>
        </div>

        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5">Thông tin tài khoản</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tên hiển thị</label>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3.5 text-gray-300 font-medium text-sm flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {session?.user?.name || '—'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-3.5 text-gray-300 font-medium text-sm flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {session?.user?.email || '—'}
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-white/[0.05]">
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-300 font-medium leading-relaxed">
              Thông tin được đồng bộ tự động từ <strong>Discord OAuth</strong>. Để thay đổi hãy cập nhật hồ sơ Discord của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Bảo mật phiên
        </h3>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-gray-300 hover:text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Đăng xuất khỏi tất cả thiết bị
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#0b0e1a] border border-red-500/15 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-600 to-red-400" />
        
        <h3 className="text-lg font-black text-red-400 flex items-center gap-3 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Danger Zone
        </h3>
        <p className="text-gray-400 text-sm mb-6">Các hành động này không thể hoàn tác. Hãy chắc chắn trước khi tiến hành.</p>

        {showDangerConfirm && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <p className="text-red-300 text-sm font-bold mb-1">⚠️ Xác nhận xóa tài khoản</p>
            <p className="text-red-400/70 text-xs">Tất cả bots, đơn hàng và số dư sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?</p>
          </div>
        )}

        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 font-bold text-red-400 px-6 py-2.5 rounded-xl transition-all text-sm disabled:opacity-50"
        >
          {deleting ? 'Đang xóa...' : showDangerConfirm ? 'Xác nhận xóa vĩnh viễn' : 'Xóa Tài Khoản'}
        </button>
        {showDangerConfirm && !deleting && (
          <button onClick={() => setShowDangerConfirm(false)} className="ml-3 text-sm text-gray-500 hover:text-white transition-colors">
            Hủy
          </button>
        )}
      </div>
    </div>
  );
}
