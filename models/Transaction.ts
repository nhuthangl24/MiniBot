import mongoose, { Schema, model, type Document } from "mongoose";

export interface ITransaction extends Document {
  userId: string;
  type: string;
  amount: number;
  description: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: String,
  type: { type: String },
  amount: Number,
  description: String,
  createdAt: { type: Date, default: Date.now },
});

export const Transaction =
  mongoose.models.Transaction ||
  model<ITransaction>("Transaction", TransactionSchema);
