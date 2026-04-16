import { AdminManualBalancePanel } from "@/components/admin/AdminManualBalancePanel";
import { AdminPlansPanel } from "@/components/admin/AdminPlansPanel";

export default function AdminBillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          Quản lý Gói cước
        </h1>
        <p className="text-sm text-gray-400">
          Chỉnh plans, slot limit, tài nguyên node và cộng tiền thủ công cho user.
        </p>
      </div>

      <AdminPlansPanel />
      <AdminManualBalancePanel />
    </div>
  );
}
