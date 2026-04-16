import { connectToDatabase } from "@/lib/db";
import { ReferralSettings } from "@/models/ReferralSettings";

export const DEFAULT_REFERRAL_SETTINGS = {
  enabled: true,
  defaultLinkBonus: 2000,
  firstReferralBonus: 10000,
  repeatReferralBonus: 5000,
  promoEndsAt: new Date("2026-04-20T23:59:59.000+07:00"),
  announcementTitle: "Thong bao cap nhat ma gioi thieu",
  announcementMessage:
    "Loi lien quan den ma gioi thieu da duoc khac phuc hoan tat.\n\nMuc thuong hien tai:\n- Luot gioi thieu dau tien: 10.000d / 1 nguoi\n- Tu luot thu 2 tro di: 5.000d / 1 nguoi\n\nSau khi het uu dai, muc thuong se quay ve 2.000d / 1 nguoi.",
};

export async function getReferralSettings() {
  await connectToDatabase();
  let settings = await ReferralSettings.findOne({ key: "default" });
  if (!settings) {
    settings = await ReferralSettings.create({
      key: "default",
      ...DEFAULT_REFERRAL_SETTINGS,
    });
  }
  return settings;
}

export function isPromoActive(settings: {
  promoEndsAt?: Date | string | null;
  firstReferralBonus?: number;
  repeatReferralBonus?: number;
}) {
  const promoEndsAt = settings.promoEndsAt ? new Date(settings.promoEndsAt) : null;
  return Boolean(
    promoEndsAt &&
      promoEndsAt.getTime() >= Date.now() &&
      (Number(settings.firstReferralBonus || 0) > 0 ||
        Number(settings.repeatReferralBonus || 0) > 0),
  );
}
