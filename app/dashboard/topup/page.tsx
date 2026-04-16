"use client";
import { useEffect, useMemo, useRef, useState } from "react";

const PRESET_AMOUNTS = [
  "10000",
  "20000",
  "50000",
  "100000",
  "200000",
  "500000",
];

export default function Topup() {
  const [amount, setAmount] = useState("50000");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualConfirming, setManualConfirming] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [statusNotice, setStatusNotice] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance || 0))
      .catch(() => setBalance(0));
  }, []);

  const handleTopup = async () => {
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount < 10000) {
      setError("Số tiền tối thiểu là 10.000đ");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setStatusNotice(data.statusMessage || "");
        setSuccess(false);
      } else {
        setError(data.error || "Tạo giao dịch thất bại");
      }
    } catch {
      setError("Lỗi kết nối mạng");
    }
    setLoading(false);
  };

  const handleManualConfirm = async () => {
    if (!order?.orderId) return;
    setManualConfirming(true);
    setManualError("");
    try {
      const res = await fetch("/api/topup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setStatusNotice(data.statusMessage || "");
      } else {
        setManualError(data.error || "Không thể gửi yêu cầu xác nhận");
      }
    } catch {
      setManualError("Lỗi kết nối mạng");
    }
    setManualConfirming(false);
  };

  const expiryText = useMemo(() => {
    if (remaining === null) return "—";
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [remaining]);

  useEffect(() => {
    if (!order?.expiredAt || order?.status !== "pending") return;

    const end = new Date(order.expiredAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();

    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [order?.expiredAt, order?.status]);

  useEffect(() => {
    if (
      !order?.orderId ||
      !["pending", "waiting_confirm"].includes(order.status)
    ) {
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/topup?orderId=${order.orderId}`);
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
          setStatusNotice(data.statusMessage || "");
          if (data.status === "paid") {
            setSuccess(true);
            const balanceRes = await fetch("/api/orders");
            const balanceData = await balanceRes.json();
            if (balanceRes.ok) {
              setBalance(balanceData.balance || 0);
            }
          }
        }
      } catch {
        // Ignore transient polling errors
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [order?.orderId, order?.status]);

  return (
    <div className="max-w-4xl w-full space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">
          Nạp tiền vào tài khoản
        </h1>
        <p className="text-gray-400 text-sm">
          Thanh toán qua chuyển khoản VietQR hoặc ví điện tử
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">
            Số dư hiện tại
          </p>
          <p className="text-3xl font-black text-white">
            {balance === null ? (
              <span className="text-gray-500 text-lg">Đang tải...</span>
            ) : (
              `${balance.toLocaleString("vi-VN")} đ`
            )}
          </p>
        </div>
        <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
          <svg
            className="w-7 h-7 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Amount Selector */}
        <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6 space-y-6">
          {/* Method Tabs */}
          <div className="flex p-1 bg-white/[0.04] rounded-xl">
            <button className="flex-1 bg-white/10 border border-white/10 rounded-lg py-2 text-sm font-bold text-white shadow-sm transition-all">
              VietQR / Chuyển khoản
            </button>
            <button className="flex-1 rounded-lg py-2 text-sm font-medium text-gray-500 cursor-not-allowed">
              Nạp thẻ cào (Bảo trì)
            </button>
          </div>

          {/* Preset Amounts */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Chọn số tiền
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2.5 px-2 rounded-xl text-sm font-bold border transition-all ${
                    amount === val
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                      : "bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/10 hover:text-white"
                  }`}
                >
                  {parseInt(val).toLocaleString("vi-VN")}đ
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Hoặc nhập số khác
            </p>
            <div className="relative">
              <input
                type="number"
                min={10000}
                step={1000}
                className="w-full bg-white/[0.04] border border-white/[0.07] focus:border-cyan-500/40 rounded-xl px-4 py-3.5 text-white outline-none transition-colors placeholder-gray-600 pr-10"
                placeholder="Tối thiểu 10.000đ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-500 text-sm">
                đ
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Nạp tiền thành công! Số dư đã được cập nhật.
            </div>
          )}
          {manualError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
              {manualError}
            </div>
          )}
          {!!statusNotice && !success && (
            <div
              className={`p-4 rounded-xl text-sm font-medium ${
                order?.status === "rejected" || order?.status === "expired"
                  ? "bg-red-500/10 border border-red-500/20 text-red-300"
                  : order?.status === "waiting_confirm"
                    ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300"
                    : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
              }`}
            >
              {statusNotice}
            </div>
          )}

          <button
            onClick={handleTopup}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? "Đang xử lý..." : "Tiếp tục thanh toán"}
          </button>
        </div>

        {/* Right: Order Summary */}
        <div className="space-y-4">
          <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="font-black text-white mb-6 flex items-center gap-2 text-sm border-b border-white/[0.05] pb-4">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Tổng kết đơn hàng
            </h3>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Số tiền nạp</span>
                <span className="text-white font-bold">
                  {(order?.amount || parseInt(amount || "0")).toLocaleString(
                    "vi-VN",
                  )}{" "}
                  đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phí giao dịch</span>
                <span className="text-green-400 font-bold">Miễn phí</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Số dư hiện tại</span>
                <span className="text-gray-300 font-medium">
                  {(balance || 0).toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-black uppercase text-xs tracking-wider">
                  Số dư sau nạp
                </span>
                <span className="text-2xl font-black text-cyan-400">
                  {(
                    (balance || 0) + (order?.amount || parseInt(amount || "0"))
                  ).toLocaleString("vi-VN")}{" "}
                  đ
                </span>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-[#0b0e1a] border border-white/[0.06] rounded-2xl p-6">
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
              Thông tin chuyển khoản
            </p>
            <div className="space-y-3 text-sm">
              {[
                { label: "Ngân hàng", value: order?.bank?.name || "MB BANK" },
                {
                  label: "Số TK",
                  value: order?.bank?.accountNo || "9704229202172453107",
                },
                {
                  label: "Chủ TK",
                  value: order?.bank?.accountName || "LUU NHU THANG",
                },
                {
                  label: "Nội dung",
                  value:
                    order?.transferContent || "MINIBOT_[USER_ID]_[ORDER_ID]",
                },
                {
                  label: "Số tiền",
                  value:
                    (order?.amount || parseInt(amount || "0")).toLocaleString(
                      "vi-VN",
                    ) + " đ",
                },
                { label: "Hết hạn", value: expiryText },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-white font-mono font-medium text-xs">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {order?.bank?.qrUrl && (
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col items-center">
                <img
                  src={order.bank.qrUrl}
                  alt="VietQR"
                  className="w-56 h-56 object-contain"
                />
                <p className="mt-3 text-xs text-gray-500">
                  Quét mã VietQR để chuyển khoản nhanh
                </p>
              </div>
            )}
            {order?.status === "pending" && (
              <button
                onClick={handleManualConfirm}
                disabled={manualConfirming}
                className="mt-4 w-full bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold py-3 rounded-xl border border-white/[0.08] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {manualConfirming
                  ? "Đang gửi yêu cầu..."
                  : "Tôi đã chuyển khoản"}
              </button>
            )}
            {order?.status === "waiting_confirm" && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-3 rounded-xl text-xs font-semibold">
                {statusNotice ||
                  "Đã gửi yêu cầu xác nhận đơn hàng. Vui lòng chờ admin kiểm tra."}
              </div>
            )}
            {order?.status === "rejected" && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs font-semibold">
                {statusNotice || "Giao dịch đã bị hủy."}
              </div>
            )}
            {order?.status === "expired" && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs font-semibold">
                {statusNotice || "Đơn nạp tiền đã hết hạn."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
