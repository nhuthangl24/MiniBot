import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PLAN_ORDER } from "@/lib/planConfig";
import { getPlanCatalog, getPlanSettings } from "@/lib/planRuntime";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

function getIdentity(session: any) {
  return session?.user?.discordId || session?.user?.id?.toString() || session?.user?.email;
}

async function isAdmin(session: any) {
  await connectToDatabase();
  const identity = getIdentity(session);
  const user = await User.findOne({
    $or: [{ discordId: identity }, { email: session?.user?.email || null }],
  });
  return user?.role === "admin";
}

export async function GET() {
  const { plans, nodeCapacity } = await getPlanCatalog();
  return NextResponse.json({ plans, nodeCapacity, order: PLAN_ORDER });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await isAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { settings } = await getPlanSettings();
  const nextPlans = { ...settings.plans };

  for (const planId of PLAN_ORDER) {
    const incoming = body?.plans?.[planId];
    if (!incoming) continue;
    nextPlans[planId] = {
      ...nextPlans[planId],
      price: Math.max(0, Number(incoming.price ?? nextPlans[planId].price)),
      ramMb: Math.max(0, Number(incoming.ramMb ?? nextPlans[planId].ramMb)),
      cpuCores: Math.max(0, Number(incoming.cpuCores ?? nextPlans[planId].cpuCores)),
      diskGb: Math.max(0, Number(incoming.diskGb ?? nextPlans[planId].diskGb)),
      slotLimit: Math.max(0, Number(incoming.slotLimit ?? nextPlans[planId].slotLimit)),
      label: String(incoming.label ?? nextPlans[planId].label),
      shortLabel: String(incoming.shortLabel ?? nextPlans[planId].shortLabel),
      periodLabel: String(incoming.periodLabel ?? nextPlans[planId].periodLabel),
    };
  }

  settings.nodeCapacity = {
    ramMb: Math.max(0, Number(body?.nodeCapacity?.ramMb ?? settings.nodeCapacity.ramMb)),
    diskGb: Math.max(0, Number(body?.nodeCapacity?.diskGb ?? settings.nodeCapacity.diskGb)),
  };
  settings.plans = nextPlans;
  await settings.save();

  return NextResponse.json({
    success: true,
    plans: settings.plans,
    nodeCapacity: settings.nodeCapacity,
    order: PLAN_ORDER,
  });
}
