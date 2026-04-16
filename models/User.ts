import mongoose, { Schema, Document, model } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  username: string;
  avatar: string;
  email?: string;
  role: 'user' | 'admin';
  referralCode?: string;
  referredBy?: string;
  referralAppliedAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  referralCode: { type: String, required: false, unique: true, sparse: true },
  referredBy: { type: String, required: false },
  referralAppliedAt: { type: Date, required: false },
}, { timestamps: true });

export const User = mongoose.models.User || model<IUser>('User', UserSchema);
