import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

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

function getStatusMessage(status: "waiting_confirm" | "paid" | "rejected") {
  switch (status) {
    case "waiting_confirm":
      return "Đã gửi yêu cầu xác nhận. Vui lòng chờ admin kiểm tra giao dịch.";
    case "paid":
      return "Giao dịch đã được xác nhận và số dư đã được cộng.";
    case "rejected":
      return "Giao dịch đã bị từ chối hoặc bị hủy bởi admin.";
  }
}

function parseAdmins() {
  const raw = process.env.TELEGRAM_ADMIN_IDS || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isAdmin(telegramUserId?: number, chatId?: number) {
  const list = parseAdmins();
  if (telegramUserId && list.length) {
    return list.includes(String(telegramUserId));
  }
  const fallbackChatIds = [
    process.env.TELEGRAM_ADMIN_CHAT_ID,
    process.env.TELEGRAM_CHAT_ID,
  ].filter(Boolean);
  if (!list.length && fallbackChatIds.length && chatId) {
    return fallbackChatIds.includes(String(chatId));
  }
  return false;
}

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: false,
    }),
  });
}

async function editMessage(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      disable_web_page_preview: true,
    }),
  });
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
  }

  return updatedOrder;
}

async function rejectTopupOrder(order: { _id: mongoose.Types.ObjectId }) {
  return TopupOrder.findOneAndUpdate(
    {
      _id: order._id,
      status: { $in: ["pending", "waiting_confirm"] },
    },
    {
      $set: {
        status: "rejected",
        statusMessage: getStatusMessage("rejected"),
        rejectedAt: new Date(),
      },
    },
    { new: true },
  );
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: true });

  const body = await req.json();
  const cb = body?.callback_query;
  if (!cb) return NextResponse.json({ ok: true });

  const callbackId = cb.id;
  const fromId = cb.from?.id;
  const data = cb.data || "";
  const message = cb.message;

  if (!isAdmin(fromId, message?.chat?.id)) {
    await answerCallback(token, callbackId, "Bạn không có quyền xác nhận.");
    return NextResponse.json({ ok: true });
  }

  const parts = data.split(":");
  if (parts.length !== 4 || parts[0] !== "topup") {
    await answerCallback(token, callbackId, "Dữ liệu không hợp lệ.");
    return NextResponse.json({ ok: true });
  }

  const action = parts[1];
  const userId = parts[2];
  const orderId = parts[3];

  await connectToDatabase();
  const order = await TopupOrder.findOne({ userId, orderId });
  if (!order) {
    await answerCallback(token, callbackId, "Không tìm thấy đơn.");
    return NextResponse.json({ ok: true });
  }

  if (!["pending", "waiting_confirm"].includes(order.status)) {
    const statusText =
      order.status === "paid"
        ? "Đơn này đã được xác nhận trước đó."
        : "Đơn đã xử lý hoặc hết hạn.";
    await answerCallback(token, callbackId, statusText);
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    const updatedOrder = await creditTopupOrder({
      _id: order._id,
      userId,
      orderId: order.orderId,
      amount: order.amount,
    });

    await answerCallback(token, callbackId, "Đã xác nhận và cộng tiền.");
    if (message?.chat?.id && message?.message_id) {
      await editMessage(
        token,
        message.chat.id,
        message.message_id,
        `${message.text}\n\n✅ ${updatedOrder?.statusMessage || getStatusMessage("paid")}`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const updatedOrder = await rejectTopupOrder({ _id: order._id });

    await answerCallback(token, callbackId, "Đã hủy giao dịch.");
    if (message?.chat?.id && message?.message_id) {
      await editMessage(
        token,
        message.chat.id,
        message.message_id,
        `${message.text}\n\n❌ ${updatedOrder?.statusMessage || getStatusMessage("rejected")}`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  await answerCallback(token, callbackId, "Hành động không hợp lệ.");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "telegram-webhook",
    timestamp: new Date().toISOString(),
  });
}
