export const PLAN_ORDER = ["free", "basic", "pro", "premium"] as const;

export type PlanId = (typeof PLAN_ORDER)[number];

export const PLAN_CONFIG: Record<
  PlanId,
  {
    price: number;
    ramMb: number;
    cpuCores: number;
    diskGb: number;
    slotLimit: number;
    label: string;
    shortLabel: string;
    periodLabel: string;
  }
> = {
  free: {
    price: 0,
    ramMb: 256,
    cpuCores: 0.5,
    diskGb: 2,
    slotLimit: 8,
    label: "Dùng thử 7 ngày",
    shortLabel: "Dùng thử",
    periodLabel: "7 ngày",
  },
  basic: {
    price: 15000,
    ramMb: 512,
    cpuCores: 1,
    diskGb: 10,
    slotLimit: 10,
    label: "Cơ bản",
    shortLabel: "Basic",
    periodLabel: "tháng",
  },
  pro: {
    price: 30000,
    ramMb: 1536,
    cpuCores: 2,
    diskGb: 20,
    slotLimit: 6,
    label: "Tiêu chuẩn",
    shortLabel: "Pro",
    periodLabel: "tháng",
  },
  premium: {
    price: 45000,
    ramMb: 2048,
    cpuCores: 3,
    diskGb: 30,
    slotLimit: 4,
    label: "Cao cấp",
    shortLabel: "Premium",
    periodLabel: "tháng",
  },
};

export const NODE_CAPACITY = {
  ramMb: 12 * 1024,
  diskGb: 320,
};

export const PLAN_PRICES: Record<PlanId, number> = {
  free: PLAN_CONFIG.free.price,
  basic: PLAN_CONFIG.basic.price,
  pro: PLAN_CONFIG.pro.price,
  premium: PLAN_CONFIG.premium.price,
};

export function formatPlanRam(planId: string) {
  const plan = PLAN_CONFIG[(planId as PlanId) || "free"] || PLAN_CONFIG.free;
  return plan.ramMb >= 1024
    ? `${(plan.ramMb / 1024).toFixed(plan.ramMb % 1024 === 0 ? 0 : 1)} GB`
    : `${plan.ramMb} MB`;
}

export function formatPlanCpu(planId: string) {
  const plan = PLAN_CONFIG[(planId as PlanId) || "free"] || PLAN_CONFIG.free;
  return `${plan.cpuCores} vCPU`;
}

export function formatPlanDisk(planId: string) {
  const plan = PLAN_CONFIG[(planId as PlanId) || "free"] || PLAN_CONFIG.free;
  return `${plan.diskGb} GB`;
}

export function isHostingActive(hosting: any, now = Date.now()) {
  if (!hosting) return false;
  if (hosting.status && hosting.status !== "active") return false;
  if (hosting.expiresAt && new Date(hosting.expiresAt).getTime() <= now) {
    return false;
  }
  return true;
}

export function getPlanAvailability(
  planId: PlanId,
  hostings: any[],
  currentHosting?: any | null,
) {
  const now = Date.now();
  const currentId = currentHosting?._id?.toString?.() || currentHosting?._id || null;
  const activeHostings = (hostings || []).filter(
    (hosting) =>
      isHostingActive(hosting, now) &&
      (currentId ? hosting?._id?.toString?.() !== currentId : true),
  );

  const usedRamMb = activeHostings.reduce(
    (total, hosting) =>
      total +
      (PLAN_CONFIG[(hosting.planId as PlanId) || "free"] || PLAN_CONFIG.free).ramMb,
    0,
  );
  const usedDiskGb = activeHostings.reduce(
    (total, hosting) =>
      total +
      (PLAN_CONFIG[(hosting.planId as PlanId) || "free"] || PLAN_CONFIG.free).diskGb,
    0,
  );
  const plan = PLAN_CONFIG[planId];
  const usedSlots = activeHostings.filter((hosting) => hosting.planId === planId).length;
  const slotRemaining = Math.max(0, plan.slotLimit - usedSlots);
  const ramRemaining = Math.max(0, NODE_CAPACITY.ramMb - usedRamMb);
  const diskRemaining = Math.max(0, NODE_CAPACITY.diskGb - usedDiskGb);

  const hasSlot = slotRemaining > 0;
  const hasRam = ramRemaining >= plan.ramMb;
  const hasDisk = diskRemaining >= plan.diskGb;
  const available = hasSlot && hasRam && hasDisk;

  let reason: string | null = null;
  if (!hasSlot) {
    reason = "Gói này đã hết slot trên node hiện tại.";
  } else if (!hasRam || !hasDisk) {
    reason = "Node hiện không còn đủ tài nguyên để cấp thêm gói này.";
  }

  return {
    available,
    reason,
    slotRemaining,
    ramRemaining,
    diskRemaining,
    usedRamMb,
    usedDiskGb,
  };
}
