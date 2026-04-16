import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getReferralSettings, isPromoActive } from "@/lib/referralSettings";
import { User } from "@/models/User";

export const REFERRAL_COMMISSION_RATE = 0.1;
export const REFERRAL_LINK_BONUS = 2000;

const BalanceSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  balance: { type: Number, default: 0 },
});

const TxSchema = new mongoose.Schema(
  {
    userId: String,
    type: { type: String },
    amount: Number,
    description: String,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false },
);

const ReferralRewardSchema = new mongoose.Schema(
  {
    referrerUserId: { type: String, index: true },
    referredUserId: { type: String, index: true },
    sourceOrderId: { type: String, index: true },
    sourceAmount: Number,
    rewardAmount: Number,
    referralCode: String,
    createdAt: { type: Date, default: Date.now },
  },
  { strict: false },
);

const Balance = mongoose.models.Balance || mongoose.model("Balance", BalanceSchema);
const Transaction =
  mongoose.models.Transaction || mongoose.model("Transaction", TxSchema);
export const ReferralReward =
  mongoose.models.ReferralReward ||
  mongoose.model("ReferralReward", ReferralRewardSchema);

export function buildReferralCode(userId?: string | null, email?: string | null) {
  const baseUserId = String(userId || "").trim();
  const baseEmail = String(email || "").trim().toLowerCase();
  const seed = `${baseUserId}|${baseEmail}`;
  const digest = crypto.createHash("sha256").update(seed).digest("hex").toUpperCase();
  const tail = baseUserId.replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `MB${tail}${digest.slice(0, 8)}`;
}

export async function syncUserReferralCode(user: any) {
  const nextCode = buildReferralCode(user?.discordId, user?.email);
  if (!user.referralCode || user.referralCode !== nextCode) {
    user.referralCode = nextCode;
    await user.save();
  }
  return nextCode;
}

export async function applyReferralCommission(params: {
  referredUserId: string;
  sourceOrderId: string;
  sourceAmount: number;
}) {
  await connectToDatabase();

  const referredUser = await User.findOne({ discordId: params.referredUserId });
  if (!referredUser?.referredBy) return null;

  const referrer = await User.findOne({ referralCode: referredUser.referredBy });
  if (!referrer || referrer.discordId === params.referredUserId) return null;

  const existingReward = await ReferralReward.findOne({
    referredUserId: params.referredUserId,
    sourceOrderId: params.sourceOrderId,
  });
  if (existingReward) return existingReward;

  const rewardAmount = Math.max(
    0,
    Math.floor(Number(params.sourceAmount || 0) * REFERRAL_COMMISSION_RATE),
  );
  if (!rewardAmount) return null;

  let balance = await Balance.findOne({ userId: referrer.discordId });
  if (!balance) {
    balance = await Balance.create({ userId: referrer.discordId, balance: 0 });
  }
  balance.balance += rewardAmount;
  await balance.save();

  await Transaction.create({
    userId: referrer.discordId,
    type: "referral_bonus",
    amount: rewardAmount,
    referralCode: referrer.referralCode,
    sourceOrderId: params.sourceOrderId,
    referredUserId: params.referredUserId,
    description: `Hoa hồng giới thiệu ${rewardAmount.toLocaleString("vi-VN")}đ từ user ${params.referredUserId}`,
  });

  await createNotification({
    userId: referrer.discordId,
    title: "Nhận hoa hồng referral",
    message: `Bạn vừa nhận ${rewardAmount.toLocaleString("vi-VN")}đ hoa hồng từ topup của user ${params.referredUserId}.`,
    type: "success",
    link: "/dashboard/topup",
    source: "referral",
  });

  return ReferralReward.create({
    referrerUserId: referrer.discordId,
    referredUserId: params.referredUserId,
    sourceOrderId: params.sourceOrderId,
    sourceAmount: params.sourceAmount,
    rewardAmount,
    referralCode: referrer.referralCode,
  });
}

export async function grantReferralLinkBonus(params: { referredUserId: string }) {
  await connectToDatabase();

  const referredUser = await User.findOne({ discordId: params.referredUserId });
  if (!referredUser?.referredBy) return null;

  const referrer = await User.findOne({ referralCode: referredUser.referredBy });
  if (!referrer || referrer.discordId === params.referredUserId) return null;

  const sourceOrderId = `referral-link:${params.referredUserId}`;
  const existingReward = await ReferralReward.findOne({
    referredUserId: params.referredUserId,
    sourceOrderId,
  });
  if (existingReward) return existingReward;

  const settings = await getReferralSettings();
  const referralCountBeforeThis = await ReferralReward.countDocuments({
    referrerUserId: referrer.discordId,
    sourceType: "link_bonus",
  });
  const rewardAmount = isPromoActive(settings)
    ? referralCountBeforeThis === 0
      ? Number(settings.firstReferralBonus || REFERRAL_LINK_BONUS)
      : Number(settings.repeatReferralBonus || REFERRAL_LINK_BONUS)
    : Number(settings.defaultLinkBonus || REFERRAL_LINK_BONUS);
  if (!rewardAmount || rewardAmount <= 0) return null;

  let balance = await Balance.findOne({ userId: referrer.discordId });
  if (!balance) {
    balance = await Balance.create({ userId: referrer.discordId, balance: 0 });
  }
  balance.balance += rewardAmount;
  await balance.save();

  await Transaction.create({
    userId: referrer.discordId,
    type: "referral_link_bonus",
    amount: rewardAmount,
    referralCode: referrer.referralCode,
    sourceOrderId,
    referredUserId: params.referredUserId,
    description: `Thưởng liên kết referral ${rewardAmount.toLocaleString("vi-VN")}đ từ user ${params.referredUserId}`,
  });

  await createNotification({
    userId: referrer.discordId,
    title: "Nhận thưởng liên kết referral",
    message: `Bạn vừa nhận ${rewardAmount.toLocaleString("vi-VN")}đ vì có người dùng liên kết mã giới thiệu của bạn.`,
    type: "success",
    link: "/dashboard/topup",
    source: "referral",
  });

  return ReferralReward.create({
    referrerUserId: referrer.discordId,
    referredUserId: params.referredUserId,
    sourceOrderId,
    sourceAmount: 0,
    rewardAmount,
    referralCode: referrer.referralCode,
    sourceType: "link_bonus",
  });
}
