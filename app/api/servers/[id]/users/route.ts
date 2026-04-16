import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  findHostingAccessForUser,
  getSessionUserId,
  hasHostingPermission,
  normalizePermissions,
} from "@/lib/serverHosting";

function sanitizeUsers(users: any[]) {
  const deduped = new Map<string, { discordId: string; permissions: string[] }>();

  for (const user of Array.isArray(users) ? users : []) {
    const discordId = String(user?.discordId || "").trim();
    if (!discordId) continue;
    deduped.set(discordId, {
      discordId,
      permissions: normalizePermissions(user?.permissions),
    });
  }

  return Array.from(deduped.values());
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(id, userId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, "users:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    users: sanitizeUsers(Array.isArray(access.hosting.sharedUsers) ? access.hosting.sharedUsers : []),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(id, userId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, "users:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { users } = await req.json();
  access.hosting.sharedUsers = sanitizeUsers(users).filter(
    (sharedUser) => sharedUser.discordId !== userId,
  );
  access.hosting.updatedAt = new Date();
  await access.hosting.save();

  return NextResponse.json({
    success: true,
    users: sanitizeUsers(access.hosting.sharedUsers),
  });
}
