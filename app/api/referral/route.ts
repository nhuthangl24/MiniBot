import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getReferralSettings, isPromoActive } from "@/lib/referralSettings";
import {
  buildReferralCode,
  grantReferralLinkBonus,
  ReferralReward,
  REFERRAL_COMMISSION_RATE,
  REFERRAL_LINK_BONUS,
  syncUserReferralCode,
} from "@/lib/referral";
import { User } from "@/models/User";

function getUserId(session: any) {
  return (
    session?.user?.discordId ||
    session?.user?.id?.toString() ||
    session?.user?.email
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const userId = getUserId(session);
  const user = await User.findOne({ discordId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const referralCode = await syncUserReferralCode(user);
  const settings = await getReferralSettings();
  const referredByUser = user.referredBy
    ? await User.findOne({ referralCode: user.referredBy })
    : null;
  const linkedUsersForBackfill = await User.find({ referredBy: referralCode })
    .sort({ referralAppliedAt: -1, createdAt: -1 })
    .select("discordId");

  await Promise.all(
    linkedUsersForBackfill.map((linkedUser: any) =>
      grantReferralLinkBonus({ referredUserId: linkedUser.discordId }),
    ),
  );

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [rewardHistory, monthlyLeaderboard, linkedUsers, totalLinkedUsers] = await Promise.all([
    ReferralReward.find({ referrerUserId: user.discordId })
      .sort({ createdAt: -1 })
      .limit(50),
    ReferralReward.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: "$referrerUserId",
          totalReward: { $sum: "$rewardAmount" },
          totalReferrals: { $sum: 1 },
        },
      },
      { $sort: { totalReward: -1, totalReferrals: -1 } },
      { $limit: 20 },
    ]),
    User.find({ referredBy: referralCode })
      .sort({ referralAppliedAt: -1, createdAt: -1 })
      .select("discordId username referralAppliedAt createdAt"),
    User.countDocuments({ referredBy: referralCode }),
  ]);

  const monthlyRank =
    monthlyLeaderboard.findIndex((item) => item._id === user.discordId) + 1 || null;
  const totalReward = rewardHistory.reduce(
    (sum, item: any) => sum + Number(item.rewardAmount || 0),
    0,
  );
  const rewardSummaryByUserId = new Map<string, any>();
  rewardHistory.forEach((item: any) => {
    const referredUserId = String(item.referredUserId);
    const current = rewardSummaryByUserId.get(referredUserId) || {
      totalReward: 0,
      latestCreatedAt: null,
      latestSourceAmount: 0,
      hasLinkBonus: false,
      hasTopupReward: false,
      latestType: "pending",
      latestRewardAmount: 0,
    };
    const nextCreatedAt = item.createdAt ? new Date(item.createdAt) : null;
    const currentCreatedAt = current.latestCreatedAt
      ? new Date(current.latestCreatedAt)
      : null;
    const isNewer = nextCreatedAt && (!currentCreatedAt || nextCreatedAt > currentCreatedAt);

    current.totalReward += Number(item.rewardAmount || 0);
    current.hasLinkBonus =
      current.hasLinkBonus || String(item.sourceType || "") === "link_bonus";
    current.hasTopupReward =
      current.hasTopupReward ||
      (Number(item.sourceAmount || 0) > 0 &&
        String(item.sourceType || "") !== "link_bonus");

    if (isNewer) {
      current.latestCreatedAt = item.createdAt;
      current.latestSourceAmount = Number(item.sourceAmount || 0);
      current.latestRewardAmount = Number(item.rewardAmount || 0);
      current.latestType =
        String(item.sourceType || "") === "link_bonus" || Number(item.sourceAmount || 0) === 0
          ? "link_bonus"
          : "topup_bonus";
    }

    rewardSummaryByUserId.set(referredUserId, current);
  });
  const referralHistory = linkedUsers.slice(0, 10).map((linkedUser: any) => {
    const reward = rewardSummaryByUserId.get(String(linkedUser.discordId));
    return {
      id: String(linkedUser._id),
      referredUserId: linkedUser.discordId,
      username: linkedUser.username,
      sourceAmount: reward?.latestSourceAmount || 0,
      rewardAmount: reward?.latestRewardAmount || 0,
      totalRewardAmount: reward?.totalReward || 0,
      createdAt:
        reward?.latestCreatedAt || linkedUser.referralAppliedAt || linkedUser.createdAt,
      status: reward?.hasTopupReward
        ? "topup_rewarded"
        : reward?.hasLinkBonus
          ? "linked_rewarded"
          : "pending",
    };
  });
  const rewardedReferrals = linkedUsers.filter((linkedUser: any) =>
    rewardSummaryByUserId.has(String(linkedUser.discordId)),
  ).length;
  const pendingReferrals = Math.max(0, totalLinkedUsers - rewardedReferrals);

  return NextResponse.json({
    referralCode,
    commissionRate: REFERRAL_COMMISSION_RATE,
    linkBonusAmount: REFERRAL_LINK_BONUS,
    referredBy: referredByUser
      ? {
          code: user.referredBy,
          username: referredByUser.username,
          discordId: referredByUser.discordId,
        }
      : null,
    monthlyRank,
    totalReward,
    totalReferrals: totalLinkedUsers,
    rewardedReferrals,
    pendingReferrals,
    campaign: {
      enabled: settings.enabled,
      title: settings.announcementTitle,
      message: settings.announcementMessage,
      promoEndsAt: settings.promoEndsAt,
      defaultLinkBonus: settings.defaultLinkBonus,
      firstReferralBonus: settings.firstReferralBonus,
      repeatReferralBonus: settings.repeatReferralBonus,
      promoActive: isPromoActive(settings),
    },
    history: referralHistory,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();
  const trimmedCode = String(code || "").trim().toUpperCase();
  if (!trimmedCode) {
    return NextResponse.json({ error: "Thiếu mã giới thiệu" }, { status: 400 });
  }

  await connectToDatabase();
  const userId = getUserId(session);
  const user = await User.findOne({ discordId: userId });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ownCode = buildReferralCode(user.discordId, user.email);
  if (trimmedCode === ownCode) {
    return NextResponse.json({ error: "Không thể nhập mã của chính bạn" }, { status: 400 });
  }
  if (user.referredBy) {
    return NextResponse.json({ error: "Bạn đã gắn mã giới thiệu trước đó" }, { status: 400 });
  }

  const referrer = await User.findOne({ referralCode: trimmedCode });
  if (!referrer) {
    return NextResponse.json({ error: "Mã giới thiệu không hợp lệ" }, { status: 404 });
  }

  user.referralCode = ownCode;
  user.referredBy = trimmedCode;
  user.referralAppliedAt = new Date();
  await user.save();

  await grantReferralLinkBonus({ referredUserId: user.discordId });

  await createNotification({
    userId: user.discordId,
    title: "Đã kích hoạt mã giới thiệu",
    message: `Tài khoản của bạn đã liên kết với mã ${trimmedCode}. Người giới thiệu đã được cộng thưởng kích hoạt, và các topup thành công sau này sẽ tiếp tục tính hoa hồng.`,
    type: "success",
    link: "/dashboard/topup",
    source: "referral",
  });

  await createNotification({
    userId: referrer.discordId,
    title: "Có người dùng liên kết referral",
    message: `${user.username || user.discordId} vừa kích hoạt mã giới thiệu của bạn.`,
    type: "info",
    link: "/dashboard",
    source: "referral",
  });

  return NextResponse.json({
    success: true,
    awardedAmount: REFERRAL_LINK_BONUS,
    referredBy: {
      code: trimmedCode,
      username: referrer.username,
      discordId: referrer.discordId,
    },
  });
}
