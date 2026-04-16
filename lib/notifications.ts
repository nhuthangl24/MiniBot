import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";

type NotificationType = "info" | "success" | "warning" | "error";

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  source?: string;
}) {
  await connectToDatabase();
  return Notification.create({
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type || "info",
    link: params.link,
    source: params.source,
    read: false,
  });
}

export async function createNotifications(
  userIds: string[],
  params: {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
    source?: string;
  },
) {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((item) => String(item || "").trim()).filter(Boolean)),
  );
  if (!uniqueUserIds.length) return [];

  await connectToDatabase();
  return Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      userId,
      title: params.title,
      message: params.message,
      type: params.type || "info",
      link: params.link,
      source: params.source,
      read: false,
    })),
  );
}
