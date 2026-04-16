import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { getReferralSettings } from "@/lib/referralSettings";
import { User } from "@/models/User";

function getUserIdentity(session: any) {
  return session?.user?.discordId || session?.user?.id?.toString() || session?.user?.email;
}

async function ensureAdmin(session: any) {
  await connectToDatabase();
  const identity = getUserIdentity(session);
  const user = await User.findOne({
    $or: [{ discordId: identity }, { email: session?.user?.email || null }],
  });
  return user?.role === "admin";
}

export async function GET() {
  const settings = await getReferralSettings();
  return NextResponse.json({
    enabled: settings.enabled,
    defaultLinkBonus: settings.defaultLinkBonus,
    firstReferralBonus: settings.firstReferralBonus,
    repeatReferralBonus: settings.repeatReferralBonus,
    promoEndsAt: settings.promoEndsAt,
    announcementTitle: settings.announcementTitle,
    announcementMessage: settings.announcementMessage,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !(await ensureAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const settings = await getReferralSettings();

  settings.enabled = Boolean(body.enabled ?? settings.enabled);
  settings.defaultLinkBonus = Math.max(0, Number(body.defaultLinkBonus ?? settings.defaultLinkBonus));
  settings.firstReferralBonus = Math.max(0, Number(body.firstReferralBonus ?? settings.firstReferralBonus));
  settings.repeatReferralBonus = Math.max(0, Number(body.repeatReferralBonus ?? settings.repeatReferralBonus));
  settings.promoEndsAt = body.promoEndsAt ? new Date(body.promoEndsAt) : null;
  settings.announcementTitle = String(body.announcementTitle || "").trim() || settings.announcementTitle;
  settings.announcementMessage =
    String(body.announcementMessage || "").trim() || settings.announcementMessage;
  await settings.save();

  return NextResponse.json({ success: true });
}
