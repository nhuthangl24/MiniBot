import mongoose, { Schema, model, type Document } from "mongoose";

export interface IBalance extends Document {
  userId: string;
  balance: number;
}

const BalanceSchema = new Schema<IBalance>({
  userId: { type: String, unique: true },
  balance: { type: Number, default: 0 },
});

export const Balance =
  mongoose.models.Balance || model<IBalance>("Balance", BalanceSchema);
