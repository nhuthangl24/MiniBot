"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (!data?.error) {
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : [],
        );
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open]);

  const markNotificationsRead = async () => {
    if (!unreadCount) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setUnreadCount(Number(data.unreadCount || 0));
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, read: true })),
        );
      }
    } catch {}
  };

  const deleteNotifications = async (ids?: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids?.length ? { ids } : { clearAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setUnreadCount(Number(data.unreadCount || 0));
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : [],
        );
      }
    } catch {}
  };

  const notificationTone = (type?: string) => {
    switch (type) {
      case "success":
        return "border-emerald-500/20 bg-emerald-500/10";
      case "warning":
        return "border-amber-500/20 bg-amber-500/10";
      case "error":
        return "border-rose-500/20 bg-rose-500/10";
      default:
        return "border-cyan-500/20 bg-cyan-500/10";
    }
  };

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-500/20 rounded-xl transition-all duration-300 group"
      >
        <Bell className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
        <span className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
          Thông báo
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[360px] max-h-[min(78vh,720px)] rounded-2xl border border-white/10 bg-[#0a0f1c] shadow-2xl shadow-black/40 p-4 z-50 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-[0.2em]">
                Notifications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markNotificationsRead}
                disabled={!unreadCount}
                className="text-[11px] font-semibold text-cyan-300 disabled:text-gray-600"
              >
                Đánh dấu đã đọc
              </button>
              <button
                type="button"
                onClick={() => void deleteNotifications()}
                disabled={!notifications.length}
                className="text-[11px] font-semibold text-rose-300 disabled:text-gray-600"
              >
                Xóa hết
              </button>
            </div>
          </div>

          <div className="grid gap-2 overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <p className="text-xs text-gray-500">Đang tải thông báo...</p>
            ) : notifications.length ? (
              notifications.slice(0, 5).map((item) => (
                <div
                  key={item._id}
                  className={`rounded-lg border px-3 py-3 ${item.read ? "border-white/5 bg-white/[0.02]" : notificationTone(item.type)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-300 leading-relaxed whitespace-pre-line break-words">
                        {item.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!item.read && (
                        <span className="mt-1 w-2 h-2 rounded-full bg-cyan-300 shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteNotifications([item._id])}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-rose-300 hover:bg-white/5 transition"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">Chưa có thông báo nào.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
