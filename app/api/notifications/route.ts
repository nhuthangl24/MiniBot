import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { createNotifications } from "@/lib/notifications";

function getSessionIdentity(session: any) {
  return {
    userId:
      session?.user?.discordId ||
      session?.user?.id?.toString() ||
      session?.user?.email,
    email: session?.user?.email || null,
  };
}

async function getAdminUser(session: any) {
  const identity = getSessionIdentity(session);
  await connectToDatabase();
  return User.findOne({
    $or: [
      { discordId: identity.userId },
      ...(identity.email ? [{ email: identity.email }] : []),
    ],
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { userId } = getSessionIdentity(session);
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { userId } = getSessionIdentity(session);
  const body = await req.json().catch(() => ({}));

  if (body.markAll) {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    await Notification.updateMany(
      { userId, _id: { $in: body.ids } },
      { $set: { read: true } },
    );
  } else {
    return NextResponse.json({ error: "Thiếu dữ liệu cập nhật" }, { status: 400 });
  }

  const unreadCount = await Notification.countDocuments({ userId, read: false });
  return NextResponse.json({ success: true, unreadCount });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { userId } = getSessionIdentity(session);
  const body = await req.json().catch(() => ({}));

  if (body.clearAll) {
    await Notification.deleteMany({ userId });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    await Notification.deleteMany({ userId, _id: { $in: body.ids } });
  } else {
    return NextResponse.json({ error: "Thiếu dữ liệu xóa" }, { status: 400 });
  }

  const unreadCount = await Notification.countDocuments({ userId, read: false });
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  return NextResponse.json({
    success: true,
    unreadCount,
    notifications: notifications.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await getAdminUser(session);
  if (adminUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const target = String(body.target || "all");
  const targetUserId = String(body.targetUserId || "").trim();
  const type = ["info", "success", "warning", "error"].includes(body.type)
    ? body.type
    : "info";
  const link = String(body.link || "").trim() || undefined;

  if (!title || !message) {
    return NextResponse.json(
      { error: "Thiếu tiêu đề hoặc nội dung thông báo" },
      { status: 400 },
    );
  }

  let targetUsers: string[] = [];

  if (target === "user") {
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Thiếu Discord ID người nhận" },
        { status: 400 },
      );
    }
    targetUsers = [targetUserId];
  } else {
    const query =
      target === "admins"
        ? { role: "admin" }
        : target === "users"
          ? { role: "user" }
          : {};
    const users = await User.find(query).select("discordId").lean();
    targetUsers = users.map((user: any) => user.discordId).filter(Boolean);
  }

  await createNotifications(targetUsers, {
    title,
    message,
    type,
    link,
    source: "admin",
  });

  return NextResponse.json({
    success: true,
    delivered: targetUsers.length,
  });
}
