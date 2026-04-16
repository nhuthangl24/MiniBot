import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  Bot,
  Zap,
  Shield,
  Globe,
  Cpu,
  Server,
  Play,
  Clock,
  Code2,
  HeadphonesIcon,
  TerminalSquare,
  Rocket,
  Activity,
  Box,
  Database,
  Lock,
  BookOpen,
  FileText,
  ChevronDown,
} from "lucide-react";
import { LandingPricing } from "@/components/LandingPricing";
import { getPlanCatalog } from "@/lib/planRuntime";

const faqItems = [
  {
    title: "Bao lâu thì hệ thống cập nhật số dư sau khi chuyển khoản?",
    content:
      "Giao dịch được quét mỗi 5 giây. Khi nội dung hoặc số tiền khớp, số dư sẽ tự cộng và hiển thị ngay trên Dashboard.",
  },
  {
    title: "Nếu chuyển sai nội dung thì sao?",
    content:
      "Hệ thống ưu tiên khớp theo nội dung MINIBOT_[USER_ID]_[ORDER_ID]. Nếu bạn chuyển sai, hãy mở ticket để đối soát thủ công.",
  },
  {
    title: "Tôi có thể dùng dự án không phải Node.js không?",
    content:
      "Có. AUTO start hỗ trợ Node.js, Python, Go, Rust, Java và Bun. Bạn chỉ cần upload đúng file entrypoint.",
  },
  {
    title: "Server có bị ngủ khi không hoạt động?",
    content:
      "Không. Tất cả gói trả phí đều chạy 24/7. Gói Free có thể reset định kỳ để tối ưu tài nguyên.",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const { plans } = await getPlanCatalog();
  const pricingPlans = [
    {
      name: "Free Trial",
      tag: "Dùng Thử",
      desc: "Tài nguyên nhỏ, phù hợp chạy kiểm thử. Dữ liệu sẽ tự động reset định kỳ.",
      price: `${Number(plans.free.price || 0).toLocaleString("vi-VN")}đ`,
      periodLabel: plans.free.periodLabel || "7 ngày",
      features: [
        `${plans.free.ramMb}MB RAM`,
        `${plans.free.cpuCores} vCore CPU`,
        `${plans.free.diskGb}GB SSD NVMe`,
      ],
      buttonText: "Tạo Bot Miễn Phí",
      highlight: false,
    },
    {
      name: "Basic",
      tag: "Cơ Bản",
      desc: "Dành cho bot nhỏ chạy ổn định 24/7 trên node giới hạn tài nguyên.",
      price: `${Number(plans.basic.price || 0).toLocaleString("vi-VN")}đ`,
      features: [
        `${plans.basic.ramMb}MB RAM`,
        `${plans.basic.cpuCores} vCore CPU`,
        `${plans.basic.diskGb}GB SSD NVMe`,
      ],
      buttonText: "Bắt đầu Basic",
      highlight: true,
      badge: "PHỔ BIẾN",
    },
    {
      name: "Pro",
      tag: "Tiêu Chuẩn",
      desc: "Cho server nhiều user hơn, workload trung bình và bot có lượng tương tác lớn.",
      price: `${Number(plans.pro.price || 0).toLocaleString("vi-VN")}đ`,
      features: [
        `${plans.pro.ramMb >= 1024 ? (plans.pro.ramMb / 1024).toFixed(plans.pro.ramMb % 1024 === 0 ? 0 : 1) : plans.pro.ramMb}${plans.pro.ramMb >= 1024 ? "GB" : "MB"} RAM`,
        `${plans.pro.cpuCores} vCore CPU`,
        `${plans.pro.diskGb}GB SSD NVMe`,
      ],
      buttonText: "Chọn Mua Pro",
      highlight: false,
    },
    {
      name: "Premium",
      tag: "Cao Cấp",
      desc: "Dành cho backend, API nặng và bot cần nhiều tài nguyên hơn trên cùng node.",
      price: `${Number(plans.premium.price || 0).toLocaleString("vi-VN")}đ`,
      features: [
        `${plans.premium.ramMb >= 1024 ? (plans.premium.ramMb / 1024).toFixed(plans.premium.ramMb % 1024 === 0 ? 0 : 1) : plans.premium.ramMb}${plans.premium.ramMb >= 1024 ? "GB" : "MB"} RAM`,
        `${plans.premium.cpuCores} vCore CPU`,
        `${plans.premium.diskGb}GB SSD NVMe`,
      ],
      buttonText: "Lên VIP Ngay",
      highlight: false,
    },
  ];
  return (
    <main className="min-h-screen bg-[#030712] text-gray-200 selection:bg-cyan-500/30 selection:text-cyan-100 flex flex-col items-center overflow-x-hidden font-sans">
      {/* Dynamic Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute top-[-20%] w-[800px] h-[500px] bg-cyan-600/20 blur-[150px] rounded-full" />
        <div className="absolute top-[30%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Premium Navbar */}
      <nav className="w-full max-w-7xl px-6 py-5 flex justify-between items-center relative z-20 mt-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md shadow-2xl">
        <div className="font-black text-2xl tracking-tighter text-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <span className="text-[#030712] text-xl font-bold">M</span>
          </div>
          MiniBot
        </div>
        <div className="hidden md:flex gap-10 text-sm font-semibold text-gray-400">
          <Link href="#features" className="hover:text-white transition-colors">
            Tính Năng
          </Link>
          <Link href="#tech" className="hover:text-white transition-colors">
            Công Nghệ
          </Link>
          <Link href="#pricing" className="hover:text-white transition-colors">
            Bảng Giá
          </Link>
          <Link href="#docs" className="hover:text-white transition-colors">
            API
          </Link>
          <Link href="#faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
        </div>
        {session ? (
          <Link
            href="/dashboard"
            className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-full font-bold transition-all text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Vào Bảng Điều Khiển
          </Link>
        ) : (
          <LoginButton
            className="bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-2 rounded-full font-bold transition-all text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            text="Đăng nhập"
          />
        )}
      </nav>

      {/* Ultra Modern Hero */}
      <section className="relative z-10 w-full max-w-7xl px-6 flex flex-col items-center justify-center text-center mt-28 mb-32">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl mb-10 text-xs font-bold uppercase tracking-widest text-gray-300 hover:bg-white/[0.08] transition-colors cursor-default">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Next-Gen Container Hosting
        </div>

        <h1 className="text-6xl md:text-[5.5rem] lg:text-[7rem] font-black tracking-tighter leading-[1.05] text-white">
          Deploy Everything.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
            Zero Config.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mt-10 mb-12 max-w-3xl font-medium leading-relaxed">
          Tạm biệt nền tảng quản lý cồng kềnh. Đẩy nhanh tốc độ chạy Bot
          Discord, Backend API với hệ thống Container cách ly, UI trực quan và
          hiệu suất siêu tốc.
        </p>

        <div className="flex flex-col sm:flex-row gap-5 items-center">
          {session ? (
            <Link
              href="/dashboard"
              className="h-14 px-10 rounded-full bg-white text-black font-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              Mở Bảng Điều Khiển
            </Link>
          ) : (
            <LoginButton
              className="h-14 px-10 rounded-full bg-white text-black font-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
              text="Triển Khai Ngay Tức Thì"
            />
          )}
          <Link
            href="#features"
            className="h-14 px-10 rounded-full bg-white/[0.05] border border-white/10 text-white font-bold flex items-center justify-center hover:bg-white/[0.1] transition-all"
          >
            Khám Phá Tính Năng
          </Link>
        </div>
      </section>

      {/* Floating Mockup (Live Console Illusion) */}
      <section className="relative z-10 w-full max-w-6xl px-6 mb-32">
        <div className="relative rounded-2xl md:rounded-[2rem] bg-[#0c1222] border border-white/10 shadow-[0_0_100px_rgba(6,182,212,0.15)] overflow-hidden">
          {/* Mockup Header */}
          <div className="h-12 bg-white/[0.02] border-b border-white/[0.05] flex items-center px-4 relative">
            <div className="flex gap-2 z-10">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-gray-500 uppercase tracking-widest pointer-events-none">
              MiniBot Live Console
            </div>
          </div>
          {/* Mockup Body */}
          <div className="p-6 md:p-10 font-mono text-sm text-gray-300 leading-loose mx-auto bg-[#0a0f1c] select-none h-[300px] overflow-hidden relative">
            <p className="text-cyan-400">
              ~ $ <span className="text-white">npm run start</span>
            </p>
            <p className="text-gray-500">&gt; minibot@2.0.0 start</p>
            <p className="text-gray-500">&gt; node index.js</p>
            <p className="text-green-400 mt-2">
              [INFO] Booting up Next-gen container isolated environment...
            </p>
            <p className="text-green-400">
              [INFO] CPU: 200% | RAM: 2048MB | SSD: 3GB NVMe
            </p>
            <p className="text-green-400 font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              [SUCCESS] Bot is online and ready to handle 1M+ requests.
            </p>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0a0f1c] to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Logos Tech Stack */}
      <section
        id="tech"
        className="w-full relative z-10 py-16 flex flex-col items-center"
      >
        <p className="text-xs font-black tracking-[0.2em] text-gray-600 uppercase mb-10 text-center">
          Nền tảng hỗ trợ mạnh mẽ mọi ngôn ngữ
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 opacity-70">
          <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer grayscale hover:grayscale-0">
            <Code2 size={28} />{" "}
            <span className="text-xl font-bold tracking-tight">Node.js</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer grayscale hover:grayscale-0">
            <TerminalSquare size={28} />{" "}
            <span className="text-xl font-bold tracking-tight">Python</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer grayscale hover:grayscale-0">
            <Server size={28} />{" "}
            <span className="text-xl font-bold tracking-tight">Java</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer grayscale hover:grayscale-0">
            <Box size={28} />{" "}
            <span className="text-xl font-bold tracking-tight">Docker</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors cursor-pointer grayscale hover:grayscale-0">
            <Database size={28} />{" "}
            <span className="text-xl font-bold tracking-tight">PostgreSQL</span>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section
        id="features"
        className="w-full py-32 px-6 relative z-10 flex flex-col items-center"
      >
        <div className="text-center mb-20 max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">
            Trải Nghiệm Khác Biệt.
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-medium">
            Bỏ qua các Control Panel nhàm chán từ thế kỷ trước. Chúng tôi tái
            định nghĩa lại trải nghiệm triển khai ứng dụng của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl w-full">
          {/* Big Box 1 */}
          <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-[#0c1222] to-[#070a14] border border-white/[0.05] p-10 rounded-[2rem] hover:border-cyan-500/30 transition-colors group flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <div className="w-14 h-14 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mb-8 border border-cyan-500/20">
                <Activity size={28} />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
                Biểu Đồ Real-Time
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Giám sát trực tiếp CPU, RAM và Disk ngay trên Dashboard bằng
                biểu đồ SVG live mượt mà. Phân tích tài nguyên chuẩn xác đến
                từng mili-giây.
              </p>
            </div>
            {/* Illusion Chart Base */}
            <div className="mt-12 opacity-30 group-hover:opacity-100 transition-opacity h-32 relative bg-gradient-to-t from-cyan-900/20 to-transparent rounded-xl border-b-2 border-cyan-500/50"></div>
          </div>

          {/* Regular Box 1 */}
          <div className="md:col-span-2 bg-[#0c1222] border border-white/[0.05] p-10 rounded-[2rem] hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
              Tài Nguyên Độc Lập
            </h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Bảo vệ an toàn bằng Docker-based container. Không share chung tài
              nguyên, cam kết phần cứng chuẩn xác.
            </p>
          </div>

          {/* Regular Box 2 */}
          <div className="md:col-span-1 bg-[#0c1222] border border-white/[0.05] p-10 rounded-[2rem] hover:border-green-500/30 transition-colors group">
            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center mb-6">
              <Globe size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
              Kéo Port API
            </h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Bật Webhook và Public Endpoint công khai cho Backend tự động.
            </p>
          </div>

          {/* Regular Box 3 */}
          <div className="md:col-span-1 bg-[#0c1222] border border-white/[0.05] p-10 rounded-[2rem] hover:border-purple-500/30 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-6">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
              Bảo Mật & DDoS
            </h3>
            <p className="text-gray-400 leading-relaxed font-medium">
              Chống DDoS tiêu chuẩn, tích hợp sẵn tường lửa Firewall Layer 4.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Redesign (Horizontal) */}
      <section
        id="pricing"
        className="w-full py-32 px-6 relative z-10 flex flex-col items-center border-y border-white/[0.02] bg-white/[0.01]"
      >
        <div className="text-center mb-20 space-y-4">
          <div className="inline-block text-cyan-500 font-black uppercase tracking-widest text-xs mb-2 bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/20">
            Cấu Hình
          </div>
          <h2 className="text-4xl md:text-5xl md:text-6xl font-black text-white tracking-tighter">
            Bảng Giá Sòng Phẳng.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto font-medium">
            Minh bạch rõ ràng, tối ưu mạnh nhất về ngân sách cho mọi dự án, từ
            nhỏ cho tới doanh nghiệp lớn.
          </p>
        </div>

        <LandingPricing loggedIn={!!session} plans={pricingPlans} />
      </section>

      {/* API Docs Preview */}
      <section
        id="docs"
        className="w-full py-28 px-6 relative z-10 flex flex-col items-center"
      >
        <div className="max-w-6xl w-full grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full text-xs font-bold uppercase tracking-widest text-cyan-300">
              <BookOpen size={14} /> Tài Liệu API
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
              API rõ ràng, tự động hoá toàn bộ.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Từ tạo hosting, quản lý container, tới nạp tiền — mọi thứ đều có
              endpoint rõ ràng, mô tả chi tiết, ví dụ thực tế và flow chuẩn.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 bg-cyan-500 text-black font-black px-6 py-3 rounded-xl hover:bg-cyan-400 transition-all"
              >
                <FileText size={18} /> Mở Docs
              </Link>
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all"
              >
                Xem gói phù hợp
              </Link>
            </div>
          </div>
          <div className="bg-[#0b0e1a] border border-white/[0.08] rounded-3xl p-6 shadow-[0_0_60px_rgba(6,182,212,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                /api/servers
              </div>
              <span className="text-[10px] uppercase font-black text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-full">
                GET
              </span>
            </div>
            <div className="bg-[#060a14] border border-white/[0.06] rounded-2xl p-4 font-mono text-xs text-gray-300 leading-relaxed">
              <p className="text-cyan-400">GET /api/servers</p>
              <p className="text-gray-500">
                Authorization: Bearer &lt;token&gt;
              </p>
              <p className="mt-3 text-gray-400">200 OK</p>
              <p className="text-gray-500">{`{ "servers": [ ... ] }`}</p>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Tham khảo thêm: /api/orders, /api/servers/:id/action, /api/topup
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="w-full py-28 px-6 relative z-10 flex flex-col items-center"
      >
        <div className="text-center mb-14 max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
            Câu Hỏi Thường Gặp
          </h2>
          <p className="text-gray-400 text-lg">
            Những câu hỏi phổ biến nhất trước khi bạn bắt đầu.
          </p>
        </div>
        <div className="w-full max-w-5xl space-y-4">
          {faqItems.map((item) => (
            <details
              key={item.title}
              className="group bg-[#0b0e1a] border border-white/[0.07] rounded-2xl p-6"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-white font-bold text-base">
                  {item.title}
                </span>
                <ChevronDown
                  className="text-cyan-400 group-open:rotate-180 transition-transform"
                  size={18}
                />
              </summary>
              <p className="text-gray-400 text-sm leading-relaxed mt-4">
                {item.content}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Massive CTA */}
      <section className="w-full relative z-10 px-6 pt-32 pb-40 flex justify-center">
        <div className="bg-gradient-to-br from-[#0c1428] via-[#0a0f1c] to-[#120c24] border border-white/10 p-16 md:p-24 rounded-[3rem] w-full max-w-6xl text-center relative overflow-hidden backdrop-blur-3xl shadow-[0_0_100px_rgba(6,182,212,0.05)]">
          <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter mb-8 relative z-10 leading-[1.1]">
            Hàng Nghìn Máy Chủ Chạy.
            <br />
            Còn Bạn Thì Sao?
          </h2>
          <p className="text-xl text-gray-400 font-medium mb-12 relative z-10 max-w-2xl mx-auto">
            Chỉ mất 10 giây thiết lập. Nạp tiền cực kì nhanh. Tham gia cùng giới
            thiết kế Bot đẳng cấp.
          </p>
          {session ? (
            <Link
              href="/dashboard"
              className="relative z-10 inline-flex items-center gap-2 bg-white text-black font-black px-12 py-5 rounded-full text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              Truy cập ngay Console
            </Link>
          ) : (
            <div className="relative z-10">
              <LoginButton
                className="bg-white text-black font-black px-12 py-5 rounded-full text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)] inline-block"
                text="Khởi Tạo Server Đấu Tiên"
              />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.05] bg-[#02050a] relative z-10 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-12 font-medium">
          <div className="space-y-6 col-span-1 md:col-span-2">
            <div className="font-black text-2xl tracking-tighter text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <span className="text-black text-xl font-bold">M</span>
              </div>
              MiniBot System
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Biến việc quản lý Server và Bot trở nên như một nghệ thuật. Cấu
              hình đỉnh cao, tối giản cực hạn.
            </p>
          </div>
          <div className="space-y-5">
            <h4 className="text-white font-bold tracking-widest text-xs uppercase uppercase">
              Sản Phẩm
            </h4>
            <ul className="text-gray-400 space-y-3 text-sm">
              <li>
                <a
                  href="#pricing"
                  className="hover:text-white transition-colors"
                >
                  Bảng Gói Cước
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-white transition-colors"
                >
                  Giải Pháp System
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Bảng Điều Khiển
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-5">
            <h4 className="text-white font-bold tracking-widest text-xs uppercase uppercase">
              Hỗ Trợ
            </h4>
            <ul className="text-gray-400 space-y-3 text-sm">
              <li>
                <Link
                  href="/docs"
                  className="hover:text-white transition-colors"
                >
                  Tài Liệu (Docs)
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Discord Trợ Giúp
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Fanpage
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-5">
            <h4 className="text-white font-bold tracking-widest text-xs uppercase uppercase">
              Pháp Lý
            </h4>
            <ul className="text-gray-400 space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Điều Khoản Mua Bán
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Chính Sách Dữ Liệu
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/[0.05] flex justify-center text-center text-gray-600 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 MiniBot Networks. Premium Cloud.</p>
        </div>
      </footer>
    </main>
  );
}
