import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  ensureTelegramWebhook,
  fetchTelegramWebhookInfo,
  getTelegramWebhookUrl,
} from "@/lib/telegramWebhook";

function isAdminSession(session: unknown) {
  return (session as { user?: { role?: string } } | null)?.user?.role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    configuredWebhookUrl: getTelegramWebhookUrl(),
    info: await fetchTelegramWebhookInfo(),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await ensureTelegramWebhook();
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.reason || "Không thể đăng ký webhook Telegram.",
        configuredWebhookUrl: result.webhookUrl,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Đã đăng ký webhook Telegram.",
    configuredWebhookUrl: result.webhookUrl,
    info: result.info,
  });
}
