import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { PLAN_ORDER, type PlanId } from "@/lib/planConfig";
import { getDynamicPlanAvailability, getPlanCatalog } from "@/lib/planRuntime";
import { HostingModel, normalizePermissions } from "@/lib/serverHosting";
import { Balance } from "@/models/Balance";
import { Transaction } from "@/models/Transaction";

function getPlanExpiry(planId: string) {
  const expiresAt = new Date();

  if (planId === "free") {
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  expiresAt.setMonth(expiresAt.getMonth() + 1);
  return expiresAt;
}

function getUserId(session: any) {
  return (
    session?.user?.discordId ||
    session?.user?.id?.toString() ||
    session?.user?.email
  );
}

function serializeHosting(hosting: any, viewerUserId?: string) {
  const plain = hosting.toObject();
  const sharedEntry = Array.isArray(plain.sharedUsers)
    ? plain.sharedUsers.find((item: any) => item?.discordId === viewerUserId)
    : null;

  return {
    ...plain,
    _id: hosting._id.toString(),
    isShared: plain.userId !== viewerUserId,
    sharedAccess: sharedEntry
      ? {
          discordId: sharedEntry.discordId,
          permissions: normalizePermissions(sharedEntry.permissions),
        }
      : null,
  };
}

// GET /api/orders - get current hosting + balance + transactions
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  await connectToDatabase();

  try {
    const { plans } = await getPlanCatalog();
    const [hosting, allHostings, sharedHostings, balanceDoc, transactions] = await Promise.all([
      HostingModel.findOne({ userId }),
      HostingModel.find({}),
      HostingModel.find({ "sharedUsers.discordId": userId, userId: { $ne: userId } }),
      Balance.findOne({ userId }),
      Transaction.find({ userId }).sort({ createdAt: -1 }).limit(30),
    ]);

    const planAvailabilityEntries = await Promise.all(
      PLAN_ORDER.map(async (planId) => [
        planId,
        await getDynamicPlanAvailability(planId, allHostings, hosting),
      ]),
    );
    const planAvailability = Object.fromEntries(planAvailabilityEntries);

    return NextResponse.json({
      hosting: hosting ? serializeHosting(hosting, userId) : null,
      sharedHostings: sharedHostings.map((item: any) => serializeHosting(item, userId)),
      plans,
      planAvailability,
      balance: balanceDoc?.balance || 0,
      transactions: transactions.map((t: any) => ({
        ...t.toObject(),
        _id: t._id.toString(),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/orders - buy or upgrade plan
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  await connectToDatabase();

  try {
    const body = await req.json();
    const rawPlanId = body.planId;

    if (!PLAN_ORDER.includes(rawPlanId)) {
      return NextResponse.json({ error: "Gói không hợp lệ" }, { status: 400 });
    }

    const planId = rawPlanId as PlanId;

    const { plans } = await getPlanCatalog();
    const price = Number(plans[planId]?.price || 0);

    const [existingHosting, allHostings, balanceDoc] = await Promise.all([
      HostingModel.findOne({ userId }),
      HostingModel.find({}),
      Balance.findOne({ userId }),
    ]);

    const newPlanIndex = PLAN_ORDER.indexOf(planId);
    const currentPlanIndex = existingHosting
      ? PLAN_ORDER.indexOf(existingHosting.planId)
      : -1;

    const availability = await getDynamicPlanAvailability(planId, allHostings, existingHosting);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || "Gói này hiện không khả dụng." },
        { status: 400 },
      );
    }

    // --- Rule: Free plan only once ---
    if (planId === "free") {
      if (existingHosting) {
        return NextResponse.json(
          { error: "Mỗi tài khoản chỉ được đăng ký Free 1 lần." },
          { status: 400 },
        );
      }
    } else {
      // Paid plan: must be an upgrade (higher tier)
      if (existingHosting && newPlanIndex <= currentPlanIndex) {
        return NextResponse.json(
          {
            error: `Bạn đang dùng gói ${existingHosting.planId.toUpperCase()}. Chỉ có thể nâng cấp lên gói cao hơn.`,
          },
          { status: 400 },
        );
      }

      // Check balance
      const currentBalance = balanceDoc?.balance || 0;
      if (currentBalance < price) {
        return NextResponse.json(
          {
            error: `Số dư không đủ. Cần ${price.toLocaleString("vi-VN")}đ, bạn có ${currentBalance.toLocaleString("vi-VN")}đ.`,
          },
          { status: 400 },
        );
      }

      // Deduct balance
      let bal = balanceDoc;
      if (!bal) bal = await Balance.create({ userId, balance: 0 });
      bal.balance -= price;
      await bal.save();

      // Log transaction
      await Transaction.create({
        userId,
        type: existingHosting ? "upgrade" : "purchase",
        amount: -price,
        description: `${existingHosting ? "Nâng cấp" : "Mua"} gói ${planId.toUpperCase()}`,
      });
    }

    const expiresAt = getPlanExpiry(planId);

    // Create or update the single hosting slot
    if (existingHosting) {
      existingHosting.planId = planId;
      existingHosting.price = price;
      existingHosting.expiresAt = expiresAt;
      existingHosting.status = "active";
      existingHosting.updatedAt = new Date();
      await existingHosting.save();
      return NextResponse.json({
        success: true,
        action: "upgraded",
        hosting: existingHosting._id.toString(),
      });
    } else {
      const hosting = await HostingModel.create({
        userId,
        planId,
        price,
        expiresAt,
      });
      return NextResponse.json({
        success: true,
        action: "created",
        hosting: hosting._id.toString(),
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/orders - top up balance
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    { error: "Dùng /api/topup để tạo giao dịch nạp tiền." },
    { status: 400 },
  );
}
