import mongoose, { Schema, Document, model } from "mongoose";

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    link: { type: String, required: false },
    read: { type: Boolean, default: false, index: true },
    source: { type: String, required: false },
  },
  { timestamps: true },
);

export const Notification =
  mongoose.models.Notification ||
  model<INotification>("Notification", NotificationSchema);
