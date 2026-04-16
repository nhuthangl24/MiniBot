type TelegramWebhookInfo = {
  ok: boolean;
  result?: {
    url?: string;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  description?: string;
};

export function isTelegramPollingEnabled() {
  return process.env.TELEGRAM_USE_POLLING === "true";
}

export function getTelegramWebhookUrl() {
  if (isTelegramPollingEnabled()) return null;
  const explicit = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (explicit) return explicit;

  const baseUrl = process.env.NEXTAUTH_URL?.trim();
  if (!baseUrl) return null;
  if (
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    !/^https?:\/\//.test(baseUrl)
  ) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;
}

export async function fetchTelegramWebhookInfo() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      { cache: "no-store" },
    );
    return (await res.json()) as TelegramWebhookInfo;
  } catch {
    return null;
  }
}

export async function ensureTelegramWebhook() {
  if (isTelegramPollingEnabled()) {
    return {
      ok: true,
      webhookUrl: null,
      reason: "Telegram đang chạy ở chế độ polling local.",
    };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = getTelegramWebhookUrl();
  if (!token || !webhookUrl) {
    return {
      ok: false,
      webhookUrl,
      reason:
        "Thiếu TELEGRAM_BOT_TOKEN hoặc chưa có TELEGRAM_WEBHOOK_URL/NEXTAUTH_URL public hợp lệ.",
    };
  }

  try {
    const info = await fetchTelegramWebhookInfo();
    if (info?.ok && info?.result?.url === webhookUrl) {
      return { ok: true, webhookUrl, info };
    }

    const setRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      },
    );
    const telegram = (await setRes.json()) as TelegramWebhookInfo;
    const updatedInfo = await fetchTelegramWebhookInfo();

    return {
      ok: Boolean(telegram?.ok),
      webhookUrl,
      info: updatedInfo,
      telegram,
      reason: telegram?.ok ? undefined : telegram?.description,
    };
  } catch {
    return {
      ok: false,
      webhookUrl,
      reason: "Không thể kết nối Telegram để đăng ký webhook.",
    };
  }
}
