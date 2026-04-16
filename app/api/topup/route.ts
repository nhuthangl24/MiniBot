import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/db";
import { ensureTelegramWebhook } from "@/lib/telegramWebhook";
import { applyReferralCommission } from "@/lib/referral";
import { createNotification } from "@/lib/notifications";
import mongoose from "mongoose";

type BankTransaction = {
  amount?: number | string;
  description?: string;
  content?: string;
  memo?: string;
  addInfo?: string;
};

const TopupOrderSchema = new mongoose.Schema(
  {
    userId: String,
    orderId: String,
    amount: Number,
    transferContent: String,
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now },
    expiredAt: Date,
  },
  { strict: false },
);

const BalanceSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  balance: { type: Number, default: 0 },
});

const TxSchema = new mongoose.Schema({
  userId: String,
  type: { type: String },
  amount: Number,
  description: String,
  createdAt: { type: Date, default: Date.now },
});

const TopupOrder =
  mongoose.models.TopupOrder || mongoose.model("TopupOrder", TopupOrderSchema);
const Balance =
  mongoose.models.Balance || mongoose.model("Balance", BalanceSchema);
const Transaction =
  mongoose.models.Transaction || mongoose.model("Transaction", TxSchema);

const BANK_NAME = "MB BANK";
const ACCOUNT_NO = "9704229202172453107";
const ACCOUNT_NAME = "LUU NHU THANG";

type TopupStatus =
  | "pending"
  | "waiting_confirm"
  | "paid"
  | "expired"
  | "rejected";

function getUserId(session: any) {
  return (
    session?.user?.discordId ||
    session?.user?.id?.toString() ||
    session?.user?.email
  );
}

function padOrderId(num: number) {
  return String(num).padStart(4, "0");
}

function buildQrUrl(amount: number, transferContent: string) {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: transferContent,
    accountName: ACCOUNT_NAME,
  });
  return `https://img.vietqr.io/image/MB-${ACCOUNT_NO}-compact2.png?${params.toString()}`;
}

function getStatusMessage(status: TopupStatus) {
  switch (status) {
    case "waiting_confirm":
      return "Đã gửi yêu cầu xác nhận. Vui lòng chờ admin kiểm tra giao dịch.";
    case "paid":
      return "Giao dịch đã được xác nhận và số dư đã được cộng.";
    case "rejected":
      return "Giao dịch đã bị từ chối hoặc bị hủy bởi admin.";
    case "expired":
      return "Đơn nạp tiền đã hết hạn. Vui lòng tạo đơn mới.";
    default:
      return "Đơn đang chờ thanh toán.";
  }
}

async function creditTopupOrder(order: {
  _id: mongoose.Types.ObjectId;
  userId: string;
  orderId: string;
  amount: number;
}) {
  const updatedOrder = await TopupOrder.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: ["pending", "waiting_confirm"] },
    },
    {
      $set: {
        status: "paid",
        statusMessage: getStatusMessage("paid"),
        paidAt: new Date(),
      },
    },
    { new: true },
  );

  if (!updatedOrder) {
    return TopupOrder.findById(order._id);
  }

  const existingTx = await Transaction.findOne({
    userId: order.userId,
    type: "topup",
    orderId: order.orderId,
  });

  if (!existingTx) {
    let bal = await Balance.findOne({ userId: order.userId });
    if (!bal) bal = await Balance.create({ userId: order.userId, balance: 0 });
    bal.balance += order.amount;
    await bal.save();

    await Transaction.create({
      userId: order.userId,
      type: "topup",
      amount: order.amount,
      orderId: order.orderId,
      description: `Nạp ${order.amount.toLocaleString("vi-VN")}đ vào tài khoản`,
    });

    await createNotification({
      userId: order.userId,
      title: "Topup thành công",
      message: `Tài khoản của bạn đã được cộng ${order.amount.toLocaleString("vi-VN")}đ.`,
      type: "success",
      link: "/dashboard/topup",
      source: "topup",
    });

    await applyReferralCommission({
      referredUserId: order.userId,
      sourceOrderId: order.orderId,
      sourceAmount: order.amount,
    });
  }

  return updatedOrder;
}

async function fetchBankTransactions(): Promise<BankTransaction[] | null> {
  const url = process.env.MB_BANK_TRANSACTIONS_URL;
  if (!url) return null;

  const headers: Record<string, string> = {};
  if (process.env.MB_BANK_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.MB_BANK_API_KEY}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data)) return data as BankTransaction[];
  if (Array.isArray(data?.data)) return data.data as BankTransaction[];
  if (Array.isArray(data?.transactions))
    return data.transactions as BankTransaction[];
  return null;
}

function normalizeAmount(value?: number | string) {
  if (value === undefined || value === null) return null;
  const raw = String(value).replace(/[^0-9]/g, "");
  if (!raw) return null;
  return Number(raw);
}

function normalizeContent(tx: BankTransaction) {
  return (
    tx.addInfo ||
    tx.content ||
    tx.memo ||
    tx.description ||
    ""
  ).toString();
}

async function notifyTelegramTopup(params: {
  userId: string;
  orderId: string;
  amount: number;
  transferContent: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await ensureTelegramWebhook();

  const message =
    "[TOPUP] Thanh toan thanh cong\n" +
    `User: ${params.userId}\n` +
    `Order: ${params.orderId}\n` +
    `So tien: ${params.amount.toLocaleString("vi-VN")} đ\n` +
    `Noi dung: ${params.transferContent}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
}

async function notifyTelegramManualConfirm(params: {
  userId: string;
  orderId: string;
  amount: number;
  transferContent: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const webhookSetup = await ensureTelegramWebhook();
  if (!webhookSetup.ok) {
    throw new Error(
      webhookSetup.reason ||
        "Telegram webhook chưa được cấu hình. Hãy đặt TELEGRAM_WEBHOOK_URL hoặc NEXTAUTH_URL là URL public của app.",
    );
  }

  const message =
    "[TOPUP] Yêu cầu xác nhận đơn hàng\n" +
    `User: ${params.userId}\n` +
    `Order: ${params.orderId}\n` +
    `Số tiền: ${params.amount.toLocaleString("vi-VN")} đ\n` +
    `Nội dung: ${params.transferContent}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Xác nhận",
              callback_data: `topup:approve:${params.userId}:${params.orderId}`,
            },
            {
              text: "❌ Hủy",
              callback_data: `topup:reject:${params.userId}:${params.orderId}`,
            },
          ],
        ],
      },
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  await connectToDatabase();

  const { amount: rawAmount } = await req.json();
  const baseAmount = Number(rawAmount);
  if (!baseAmount || baseAmount < 10000) {
    return NextResponse.json(
      { error: "Số tiền tối thiểu là 10.000đ" },
      { status: 400 },
    );
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 10 * 60 * 1000);

  const orderCount = await TopupOrder.countDocuments({ userId });
  const orderId = padOrderId(orderCount + 1);
  const transferContent = `MINIBOT_${userId}_${orderId}`;

  const amount = baseAmount;

  const order = await TopupOrder.create({
    userId,
    orderId,
    amount,
    transferContent,
    status: "pending",
    statusMessage: getStatusMessage("pending"),
    createdAt: now,
    expiredAt: expiry,
  });

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    transferContent: order.transferContent,
    status: order.status,
    statusMessage: order.statusMessage,
    expiredAt: order.expiredAt,
    bank: {
      name: BANK_NAME,
      accountNo: ACCOUNT_NO,
      accountName: ACCOUNT_NAME,
      qrUrl: buildQrUrl(order.amount, order.transferContent),
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 });
  }

  await connectToDatabase();

  const order = await TopupOrder.findOne({ userId, orderId });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  }

  const now = new Date();
  if (order.status === "pending" && order.expiredAt && now > order.expiredAt) {
    order.status = "expired";
    order.statusMessage = getStatusMessage("expired");
    await order.save();
  }

  if (order.status === "pending") {
    const txs = await fetchBankTransactions();
    if (txs && txs.length) {
      const matched = txs.find((tx) => {
        const amt = normalizeAmount(tx.amount);
        const content = normalizeContent(tx);
        return (
          (amt !== null && amt === order.amount) ||
          (content && content.includes(order.transferContent))
        );
      });

      if (matched) {
        const paidOrder = await creditTopupOrder({
          _id: order._id,
          userId,
          orderId: order.orderId,
          amount: order.amount,
        });

        await notifyTelegramTopup({
          userId,
          orderId: paidOrder?.orderId || order.orderId,
          amount: paidOrder?.amount || order.amount,
          transferContent: paidOrder?.transferContent || order.transferContent,
        });

        if (paidOrder) {
          order.status = paidOrder.status;
          order.statusMessage = paidOrder.statusMessage;
        }
      }
    }
  }

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    transferContent: order.transferContent,
    status: order.status,
    statusMessage: order.statusMessage || getStatusMessage(order.status),
    expiredAt: order.expiredAt,
    bank: {
      name: BANK_NAME,
      accountNo: ACCOUNT_NO,
      accountName: ACCOUNT_NAME,
      qrUrl: buildQrUrl(order.amount, order.transferContent),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getUserId(session);
  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 });
  }

  await connectToDatabase();

  const order = await TopupOrder.findOne({ userId, orderId });
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  }

  const now = new Date();
  if (order.expiredAt && now > order.expiredAt) {
    order.status = "expired";
    order.statusMessage = getStatusMessage("expired");
    await order.save();
  }

  if (order.status === "pending") {
    order.status = "waiting_confirm";
    order.statusMessage = getStatusMessage("waiting_confirm");
    order.requestedConfirmAt = new Date();
    await order.save();
    try {
      await notifyTelegramManualConfirm({
        userId,
        orderId: order.orderId,
        amount: order.amount,
        transferContent: order.transferContent,
      });
    } catch (error) {
      order.status = "pending";
      order.statusMessage =
        error instanceof Error ? error.message : getStatusMessage("pending");
      await order.save();
      return NextResponse.json({ error: order.statusMessage }, { status: 500 });
    }
  }

  return NextResponse.json({
    orderId: order.orderId,
    amount: order.amount,
    transferContent: order.transferContent,
    status: order.status,
    statusMessage: order.statusMessage || getStatusMessage(order.status),
    expiredAt: order.expiredAt,
    bank: {
      name: BANK_NAME,
      accountNo: ACCOUNT_NO,
      accountName: ACCOUNT_NAME,
      qrUrl: buildQrUrl(order.amount, order.transferContent),
    },
  });
}
