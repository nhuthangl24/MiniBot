"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const PERMISSION_GROUPS = [
  {
    title: "Console",
    items: [
      { key: "console:view", label: "View Console", desc: "Xem log và trạng thái runtime" },
      { key: "console:command", label: "Send Command", desc: "Gửi lệnh vào console" },
    ],
  },
  {
    title: "Files",
    items: [
      { key: "files:view", label: "View Files", desc: "Xem và tải file" },
      { key: "files:write", label: "Write Files", desc: "Tạo, upload và sửa file" },
      { key: "files:delete", label: "Delete Files", desc: "Xóa file và thư mục" },
    ],
  },
  {
    title: "Startup",
    items: [
      { key: "startup:view", label: "View Startup", desc: "Xem cấu hình runtime" },
      { key: "startup:edit", label: "Edit Startup", desc: "Đổi startup command, git, image" },
    ],
  },
  {
    title: "Settings",
    items: [
      { key: "settings:view", label: "View Settings", desc: "Xem thông tin bot và debug" },
      { key: "settings:edit", label: "Edit Settings", desc: "Đổi tên, mô tả và cài đặt" },
    ],
  },
  {
    title: "Power",
    items: [
      { key: "power:start", label: "Start", desc: "Khởi động container" },
      { key: "power:stop", label: "Stop", desc: "Dừng container" },
      { key: "power:restart", label: "Restart", desc: "Restart hoặc reinstall" },
      { key: "power:kill", label: "Kill", desc: "Tắt cưỡng bức container" },
    ],
  },
  {
    title: "Users",
    items: [
      { key: "users:view", label: "View Users", desc: "Xem danh sách shared user" },
      { key: "users:manage", label: "Manage Users", desc: "Thêm, sửa, xóa quyền user khác" },
    ],
  },
] as const;

const DEFAULT_PERMISSIONS = ["console:view", "console:command"];

interface SubUser {
  discordId: string;
  name?: string;
  permissions: string[];
}

export default function UsersPage() {
  const params = useParams<{ id: string }>();
  const serverId = params?.id as string;

  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/servers/${serverId}/users`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.error) {
          setSubUsers(Array.isArray(data.users) ? data.users : []);
        }
      })
      .catch(() => {});
  }, [serverId]);

  const persistUsers = async (users: SubUser[]) => {
    const res = await fetch(`/api/servers/${serverId}/users`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không thể lưu users");
    }
    setSubUsers(Array.isArray(data.users) ? data.users : users);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const togglePerm = (key: string) => {
    setNewPerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const startEdit = (user: SubUser) => {
    setShowAdd(true);
    setEditingId(user.discordId);
    setNewId(user.discordId);
    setNewPerms(user.permissions);
    setError("");
  };

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewId("");
    setNewPerms(DEFAULT_PERMISSIONS);
    setError("");
  };

  const handleAdd = async () => {
    if (!newId.trim()) {
      setError("Vui lòng nhập Discord ID");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const targetId = newId.trim();
      const nextUsers = [
        ...subUsers.filter((user) => user.discordId !== targetId),
        { discordId: targetId, permissions: newPerms },
      ];
      await persistUsers(nextUsers);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể thêm user");
    }
    setAdding(false);
  };

  const removeUser = async (discordId: string) => {
    try {
      const nextUsers = subUsers.filter((u) => u.discordId !== discordId);
      await persistUsers(nextUsers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xóa user");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b1222] via-[#0a1020] to-[#070d18] p-6">
        <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300 font-bold">
          Access Control
        </p>
        <h1 className="text-2xl font-black text-white mt-2">Quản lý Users</h1>
        <p className="text-xs text-gray-500 mt-1">
          Cấp quyền theo vai trò, quản lý truy cập và audit quyền.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0b111e] p-6">
        {saved && (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
            Danh sách users đã được cập nhật.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">Thêm user vào hosting</p>
            <p className="text-xs text-gray-500 mt-1">
              User được thêm sẽ thấy thêm một hosting phụ trong dashboard với đúng phạm vi quyền bạn cấp.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-bold"
          >
            {showAdd ? "Đóng" : "Thêm user"}
          </button>
        </div>

        {showAdd && (
          <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-5">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Discord ID
              </label>
              <input
                className="w-full bg-[#0a0f18] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none"
                placeholder="VD: 123456789012345678"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Permissions
              </label>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300 mb-3">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map(({ key, label, desc }) => (
                        <label
                          key={key}
                          className="flex items-start gap-3 p-3 rounded-2xl bg-[#0a0f18] border border-white/10 hover:bg-white/[0.05] transition"
                        >
                          <input
                            type="checkbox"
                            checked={newPerms.includes(key)}
                            onChange={() => togglePerm(key)}
                            className="mt-1 w-4 h-4 accent-cyan-500"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-rose-300 text-sm font-medium">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={adding}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold px-6 py-2.5 rounded-full text-sm transition-all disabled:opacity-50"
              >
                {adding ? "Đang lưu..." : editingId ? "Lưu quyền" : "Xác nhận thêm"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                }}
                className="text-gray-500 hover:text-white font-bold text-sm transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0b111e] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 font-bold">
            Thành viên
          </p>
        </div>
        {subUsers.length === 0 ? (
          <p className="p-8 text-center text-gray-600 text-sm">
            Chưa có subuser nào trên server này.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {subUsers.map((u) => (
              <div key={u.discordId} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-300 font-black text-sm">
                    {u.discordId.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm font-mono">{u.discordId}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold capitalize"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-cyan-200 hover:text-cyan-100 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-3 py-1.5 rounded-full font-bold text-xs"
                  >
                    Sửa quyền
                  </button>
                  <button
                    onClick={() => void removeUser(u.discordId)}
                    className="text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-full font-bold text-xs"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
