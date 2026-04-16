import mongoose, { Schema, Document, model } from "mongoose";

export interface IReferralSettings extends Document {
  key: string;
  enabled: boolean;
  defaultLinkBonus: number;
  firstReferralBonus: number;
  repeatReferralBonus: number;
  promoEndsAt?: Date | null;
  announcementTitle: string;
  announcementMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSettingsSchema = new Schema<IReferralSettings>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enabled: { type: Boolean, default: true },
    defaultLinkBonus: { type: Number, default: 2000 },
    firstReferralBonus: { type: Number, default: 10000 },
    repeatReferralBonus: { type: Number, default: 5000 },
    promoEndsAt: { type: Date, default: null },
    announcementTitle: {
      type: String,
      default: "Thong bao cap nhat ma gioi thieu",
    },
    announcementMessage: {
      type: String,
      default:
        "Loi lien quan den ma gioi thieu da duoc khac phuc hoan tat.\n\nMuc thuong hien tai:\n- Luot gioi thieu dau tien: 10.000d / 1 nguoi\n- Tu luot thu 2 tro di: 5.000d / 1 nguoi\n\nSau khi het uu dai, muc thuong se quay ve 2.000d / 1 nguoi.",
    },
  },
  { timestamps: true },
);

export const ReferralSettings =
  mongoose.models.ReferralSettings ||
  model<IReferralSettings>("ReferralSettings", ReferralSettingsSchema);
