import { connectToDatabase } from "@/lib/db";
import {
  NODE_CAPACITY,
  PLAN_CONFIG,
  PLAN_ORDER,
  type PlanId,
} from "@/lib/planConfig";
import { PlanSettings } from "@/models/PlanSettings";

export async function getPlanSettings() {
  await connectToDatabase();
  let settings = await PlanSettings.findOne({ key: "default" });
  if (!settings) {
    settings = await PlanSettings.create({
      key: "default",
      nodeCapacity: NODE_CAPACITY,
      plans: PLAN_CONFIG,
    });
  }

  const plans = Object.fromEntries(
    PLAN_ORDER.map((planId) => [
      planId,
      {
        ...PLAN_CONFIG[planId],
        ...(settings?.plans?.[planId] || {}),
      },
    ]),
  ) as typeof PLAN_CONFIG;

  return {
    settings,
    nodeCapacity: {
      ramMb: Number(settings.nodeCapacity?.ramMb || NODE_CAPACITY.ramMb),
      diskGb: Number(settings.nodeCapacity?.diskGb || NODE_CAPACITY.diskGb),
    },
    plans,
  };
}

export async function getPlanCatalog() {
  const { plans, nodeCapacity } = await getPlanSettings();
  return { plans, nodeCapacity };
}

export async function getDynamicPlanAvailability(
  planId: PlanId,
  hostings: any[],
  currentHosting?: any | null,
) {
  const { plans, nodeCapacity } = await getPlanSettings();
  const now = Date.now();
  const currentId = currentHosting?._id?.toString?.() || currentHosting?._id || null;
  const activeHostings = (hostings || []).filter((hosting) => {
    if (!hosting) return false;
    if (hosting.status && hosting.status !== "active") return false;
    if (hosting.expiresAt && new Date(hosting.expiresAt).getTime() <= now) return false;
    if (currentId && hosting?._id?.toString?.() === currentId) return false;
    return true;
  });

  const usedRamMb = activeHostings.reduce(
    (total, hosting) => total + Number(plans[(hosting.planId as PlanId) || "free"]?.ramMb || 0),
    0,
  );
  const usedDiskGb = activeHostings.reduce(
    (total, hosting) => total + Number(plans[(hosting.planId as PlanId) || "free"]?.diskGb || 0),
    0,
  );
  const plan = plans[planId];
  const usedSlots = activeHostings.filter((hosting) => hosting.planId === planId).length;
  const slotRemaining = Math.max(0, Number(plan.slotLimit || 0) - usedSlots);
  const ramRemaining = Math.max(0, Number(nodeCapacity.ramMb || 0) - usedRamMb);
  const diskRemaining = Math.max(0, Number(nodeCapacity.diskGb || 0) - usedDiskGb);
  const available =
    slotRemaining > 0 &&
    ramRemaining >= Number(plan.ramMb || 0) &&
    diskRemaining >= Number(plan.diskGb || 0);

  let reason: string | null = null;
  if (slotRemaining <= 0) {
    reason = "Gói này đã hết slot trên node hiện tại.";
  } else if (ramRemaining < Number(plan.ramMb || 0) || diskRemaining < Number(plan.diskGb || 0)) {
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
