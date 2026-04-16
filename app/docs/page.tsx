import Link from "next/link";
import { BookOpen, Search, Shield, Server, Wallet } from "lucide-react";

type ApiField = {
  name: string;
  type?: string;
  desc: string;
};

type ApiEndpoint = {
  method: string;
  path: string;
  description: string;
  query?: ApiField[];
  body?: ApiField[];
  response?: ApiField[];
  notes?: string[];
};

type ApiSection = {
  id: string;
  title: string;
  icon: typeof Shield;
  desc: string;
  endpoints: ApiEndpoint[];
};

const sections: ApiSection[] = [
  {
    id: "auth",
    title: "Xác thực",
    icon: Shield,
    desc: "Đăng nhập Discord và quản lý session người dùng.",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/signin",
        description: "Đăng nhập bằng Discord và tạo session.",
        response: [
          { name: "session", type: "object", desc: "Session người dùng." },
        ],
      },
      {
        method: "GET",
        path: "/api/auth/session",
        description: "Lấy session hiện tại.",
        response: [
          { name: "user", type: "object", desc: "Thông tin người dùng." },
          { name: "expires", type: "string", desc: "Thời gian hết hạn session." },
        ],
      },
    ],
  },
  {
    id: "orders",
    title: "Thanh toán & gói",
    icon: Wallet,
    desc: "Quản lý số dư, giao dịch và gói dịch vụ.",
    endpoints: [
      {
        method: "GET",
        path: "/api/orders",
        description: "Lấy số dư, hosting hiện tại và lịch sử giao dịch.",
        response: [
          { name: "hosting", type: "object | null", desc: "Thông tin gói hiện tại." },
          { name: "balance", type: "number", desc: "Số dư hiện tại." },
          { name: "transactions", type: "array", desc: "30 giao dịch gần nhất." },
        ],
      },
      {
        method: "POST",
        path: "/api/orders",
        description: "Mua hoặc nâng cấp gói (trừ tiền từ balance).",
        body: [
          { name: "planId", type: "string", desc: "free | basic | pro | premium" },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
          { name: "action", type: "string", desc: "created | upgraded" },
          { name: "hosting", type: "string", desc: "ID hosting." },
        ],
      },
      {
        method: "POST",
        path: "/api/topup",
        description: "Tạo đơn nạp tiền và QR VietQR.",
        body: [
          { name: "amount", type: "number", desc: "Số tiền nạp (>= 10000)." },
        ],
        response: [
          { name: "orderId", type: "string", desc: "Mã đơn nạp." },
          { name: "amount", type: "number", desc: "Số tiền cần chuyển." },
          { name: "transferContent", type: "string", desc: "Nội dung chuyển khoản." },
          { name: "status", type: "string", desc: "pending | paid | expired | waiting_confirm" },
          { name: "expiredAt", type: "string", desc: "Hạn thanh toán." },
          { name: "bank", type: "object", desc: "Thông tin tài khoản và QR." },
        ],
      },
      {
        method: "GET",
        path: "/api/topup",
        description: "Kiểm tra trạng thái nạp tiền.",
        query: [
          { name: "orderId", type: "string", desc: "Mã đơn nạp." },
        ],
        response: [
          { name: "status", type: "string", desc: "pending | paid | expired" },
          { name: "bank", type: "object", desc: "Thông tin ngân hàng." },
        ],
      },
      {
        method: "PATCH",
        path: "/api/topup",
        description: "Gửi yêu cầu xác nhận thủ công.",
        body: [
          { name: "orderId", type: "string", desc: "Mã đơn nạp." },
        ],
        response: [
          { name: "status", type: "string", desc: "waiting_confirm | expired" },
        ],
      },
    ],
  },
  {
    id: "hostings",
    title: "Máy chủ",
    icon: Server,
    desc: "Quản lý container, file và cấu hình khởi động.",
    endpoints: [
      {
        method: "GET",
        path: "/api/servers/:id/status",
        description: "Lấy trạng thái container theo hosting.",
        response: [
          { name: "status", type: "string", desc: "running | offline" },
          { name: "details", type: "object | null", desc: "Thông tin container từ Docker." },
        ],
      },
      {
        method: "POST",
        path: "/api/servers/:id/action",
        description: "Điều khiển container (start/stop/restart/kill/delete/reinstall/provision).",
        body: [
          { name: "action", type: "string", desc: "start | stop | restart | kill | delete | reinstall | provision" },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
          { name: "containerId", type: "string", desc: "ID container (nếu có)." },
          { name: "deploymentId", type: "string", desc: "ID deployment (khi provision)." },
        ],
      },
      {
        method: "GET",
        path: "/api/servers/:id/files",
        description: "Đọc danh sách file hoặc nội dung file.",
        query: [
          { name: "path", type: "string", desc: "Đường dẫn thư mục hoặc file (mặc định '/')." },
        ],
        response: [
          { name: "files", type: "array", desc: "Danh sách file/thư mục." },
          { name: "content", type: "string", desc: "Nội dung file (nếu path là file)." },
          { name: "isFile", type: "boolean", desc: "true nếu path là file." },
        ],
      },
      {
        method: "POST",
        path: "/api/servers/:id/files",
        description: "Upload hoặc ghi/xóa file, tạo thư mục.",
        body: [
          { name: "file", type: "File", desc: "Upload file (multipart/form-data)." },
          { name: "path", type: "string", desc: "Thư mục đích khi upload." },
          { name: "action", type: "string", desc: "create_folder | delete | write (JSON)." },
          { name: "filePath", type: "string", desc: "Đường dẫn file/thư mục (JSON)." },
          { name: "content", type: "string", desc: "Nội dung file khi ghi (JSON)." },
        ],
        notes: [
          "Upload file dùng multipart/form-data với field 'file' và 'path'.",
          "Ghi/xóa/tạo thư mục dùng JSON body với action.",
        ],
      },
      {
        method: "GET",
        path: "/api/servers/:id/startup",
        description: "Lấy lệnh start hiện tại.",
        response: [
          { name: "startCommand", type: "string", desc: "Lệnh start." },
        ],
      },
      {
        method: "PUT",
        path: "/api/servers/:id/startup",
        description: "Cập nhật cấu hình startup và git.",
        body: [
          { name: "startCommand", type: "string", desc: "Lệnh start (hoặc AUTO)." },
          { name: "startupTemplate", type: "string", desc: "Template startup tùy biến." },
          { name: "envType", type: "string", desc: "Image Docker (vd: node:20-alpine)." },
          { name: "gitRepo", type: "string", desc: "Repo git để auto pull." },
          { name: "gitBranch", type: "string", desc: "Nhánh git (mặc định main)." },
          { name: "autoPull", type: "boolean", desc: "Bật auto pull khi start." },
          { name: "gitUser", type: "string", desc: "User git nếu cần." },
          { name: "gitToken", type: "string", desc: "Token git nếu cần." },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
        ],
      },
      {
        method: "PUT",
        path: "/api/servers/:id/settings",
        description: "Cập nhật thông tin bot (tên, mô tả).",
        body: [
          { name: "botName", type: "string", desc: "Tên bot." },
          { name: "description", type: "string", desc: "Mô tả bot." },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
        ],
      },
    ],
  },
  {
    id: "deployments",
    title: "Triển khai",
    icon: Server,
    desc: "Tạo và quản lý bot từ repo Git.",
    endpoints: [
      {
        method: "GET",
        path: "/api/deployments",
        description: "Lấy danh sách deployments của user.",
        response: [
          { name: "deployments", type: "array", desc: "Danh sách deployment." },
        ],
      },
      {
        method: "POST",
        path: "/api/deployments",
        description: "Tạo deployment mới từ repo.",
        body: [
          { name: "repoUrl", type: "string", desc: "URL repo git." },
          { name: "name", type: "string", desc: "Tên bot/deployment." },
          { name: "envType", type: "string", desc: "Image Docker (tùy chọn)." },
          { name: "startCommand", type: "string", desc: "Lệnh start (tùy chọn)." },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
          { name: "deploymentId", type: "string", desc: "ID deployment." },
        ],
      },
      {
        method: "POST",
        path: "/api/deployments/:id",
        description: "Điều khiển deployment (start/stop/restart).",
        body: [
          { name: "action", type: "string", desc: "start | stop | restart" },
        ],
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
          { name: "status", type: "string", desc: "running | stopped" },
        ],
      },
      {
        method: "DELETE",
        path: "/api/deployments/:id",
        description: "Xóa deployment.",
        response: [
          { name: "success", type: "boolean", desc: "Trạng thái thao tác." },
        ],
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#060a14] text-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-[260px_1fr] gap-10">
        <aside className="bg-[#0b0f1c] border border-white/10 rounded-2xl p-5 h-fit sticky top-8">
          <div className="flex items-center gap-2 text-white font-black mb-6">
            <BookOpen size={18} />
            Mục lục
          </div>
          <div className="space-y-3 text-sm font-semibold text-gray-400">
            <Link href="/" className="block hover:text-white">
              Tổng quan
            </Link>
            <div className="pt-2 text-xs uppercase tracking-widest text-gray-500">
              Bắt đầu
            </div>
            <Link href="#auth" className="block hover:text-white">
              Đăng nhập
            </Link>
            <Link href="#orders" className="block hover:text-white">
              Thanh toán
            </Link>
            <div className="pt-3 text-xs uppercase tracking-widest text-gray-500">
              Tham khảo API
            </div>
            <Link href="#auth" className="block hover:text-white">
              Xác thực
            </Link>
            <Link href="#orders" className="block hover:text-white">
              Thanh toán & gói
            </Link>
            <Link href="#hostings" className="block hover:text-white">
              Máy chủ
            </Link>
            <Link href="#deployments" className="block hover:text-white">
              Triển khai
            </Link>
            <div className="pt-3 text-xs uppercase tracking-widest text-gray-500">
              Quản lý máy chủ
            </div>
            <Link href="/dashboard/servers" className="block hover:text-white">
              Bảng điều khiển
            </Link>
            <Link href="/dashboard/servers" className="block hover:text-white">
              Trình quản lý file
            </Link>
          </div>
        </aside>

        <section className="space-y-10">
          <div className="bg-[#0b0f1c] border border-white/10 rounded-3xl p-8">
            <div className="flex items-center gap-3 text-cyan-300 text-xs font-black uppercase tracking-widest mb-4">
              <BookOpen size={14} /> Tài liệu API
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              Tài liệu đang phát triển
            </h1>
            <p className="text-gray-400 text-sm">
              Phần docs đang được cập nhật để đồng bộ với phiên bản mới.
            </p>
            <div className="mt-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                placeholder="Tìm kiếm trong docs..."
                className="w-full bg-[#060b14] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 outline-none focus:border-cyan-500/40"
              />
            </div>
          </div>

          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-[#0b0f1c] border border-white/10 rounded-3xl p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <section.icon size={20} className="text-cyan-400" />
                <h2 className="text-2xl font-black text-white">
                  {section.title}
                </h2>
              </div>
              <p className="text-gray-400 text-sm mb-6">{section.desc}</p>
              <div className="space-y-4">
                {section.endpoints.map((ep, idx) => (
                  <div
                    key={`${section.id}-${ep.method}-${ep.path}-${idx}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#060b14] border border-white/10 rounded-2xl px-5 py-4"
                  >
                    <div>
                      <div className="text-xs font-black text-cyan-300 uppercase tracking-widest mb-1">
                        {ep.method}
                      </div>
                      <div className="text-white font-mono text-sm">
                        {ep.path}
                      </div>
                      {(ep.query || ep.body || ep.response || ep.notes) && (
                        <div className="mt-3 space-y-3">
                          {ep.query && ep.query.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                Query
                              </p>
                              <div className="mt-1 space-y-1 text-xs text-gray-300">
                                {ep.query.map((field, fieldIndex) => (
                                  <div
                                    key={`${ep.path}-query-${field.name}-${fieldIndex}`}
                                    className="flex flex-wrap gap-2"
                                  >
                                    <span className="font-mono text-cyan-300">
                                      {field.name}
                                    </span>
                                    {field.type && (
                                      <span className="text-gray-500">({field.type})</span>
                                    )}
                                    <span className="text-gray-400">{field.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.body && ep.body.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                Body
                              </p>
                              <div className="mt-1 space-y-1 text-xs text-gray-300">
                                {ep.body.map((field, fieldIndex) => (
                                  <div
                                    key={`${ep.path}-body-${field.name}-${fieldIndex}`}
                                    className="flex flex-wrap gap-2"
                                  >
                                    <span className="font-mono text-cyan-300">
                                      {field.name}
                                    </span>
                                    {field.type && (
                                      <span className="text-gray-500">({field.type})</span>
                                    )}
                                    <span className="text-gray-400">{field.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.response && ep.response.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                Response
                              </p>
                              <div className="mt-1 space-y-1 text-xs text-gray-300">
                                {ep.response.map((field, fieldIndex) => (
                                  <div
                                    key={`${ep.path}-response-${field.name}-${fieldIndex}`}
                                    className="flex flex-wrap gap-2"
                                  >
                                    <span className="font-mono text-cyan-300">
                                      {field.name}
                                    </span>
                                    {field.type && (
                                      <span className="text-gray-500">({field.type})</span>
                                    )}
                                    <span className="text-gray-400">{field.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {ep.notes && ep.notes.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                Ghi chú
                              </p>
                              <div className="mt-1 space-y-1 text-xs text-gray-300">
                                {ep.notes.map((note, noteIndex) => (
                                  <div key={`${ep.path}-note-${noteIndex}`}>
                                    • {note}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm md:text-right">
                      {ep.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
