import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { Balance } from "@/models/Balance";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";

function getIdentity(session: any) {
  return session?.user?.discordId || session?.user?.id?.toString() || session?.user?.email;
}

async function getAdmin(session: any) {
  await connectToDatabase();
  const identity = getIdentity(session);
  return User.findOne({
    $or: [{ discordId: identity }, { email: session?.user?.email || null }],
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await getAdmin(session);
  if (admin?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = String(body.userId || "").trim();
  const amount = Math.floor(Number(body.amount || 0));
  const reason = String(body.reason || "").trim();

  if (!targetUserId || !amount || amount <= 0 || !reason) {
    return NextResponse.json(
      { error: "Thiếu Discord ID, số tiền hoặc lý do cộng tiền." },
      { status: 400 },
    );
  }

  const targetUser = await User.findOne({
    $or: [{ discordId: targetUserId }, { email: targetUserId }],
  });
  if (!targetUser) {
    return NextResponse.json({ error: "Không tìm thấy user." }, { status: 404 });
  }

  let balance = await Balance.findOne({ userId: targetUser.discordId });
  if (!balance) {
    balance = await Balance.create({ userId: targetUser.discordId, balance: 0 });
  }
  balance.balance += amount;
  await balance.save();

  const description = `Admin cong tay ${amount.toLocaleString("vi-VN")}đ - ${reason}`;
  await Transaction.create({
    userId: targetUser.discordId,
    type: "manual_credit",
    amount,
    description,
  });

  await createNotification({
    userId: targetUser.discordId,
    title: "Được cộng tiền thủ công",
    message: `Tài khoản của bạn vừa được cộng ${amount.toLocaleString("vi-VN")}đ. Lý do: ${reason}`,
    type: "success",
    link: "/dashboard/history",
    source: "admin",
  });

  return NextResponse.json({
    success: true,
    balance: balance.balance,
    targetUserId: targetUser.discordId,
  });
}
