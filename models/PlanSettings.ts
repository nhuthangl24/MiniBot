import mongoose, { Schema, model, type Document } from "mongoose";
import { NODE_CAPACITY, PLAN_CONFIG } from "@/lib/planConfig";

export interface IPlanSettings extends Document {
  key: string;
  nodeCapacity: {
    ramMb: number;
    diskGb: number;
  };
  plans: typeof PLAN_CONFIG;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSettingsSchema = new Schema<IPlanSettings>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    nodeCapacity: {
      ramMb: { type: Number, default: NODE_CAPACITY.ramMb },
      diskGb: { type: Number, default: NODE_CAPACITY.diskGb },
    },
    plans: { type: Schema.Types.Mixed, required: true, default: PLAN_CONFIG },
  },
  { timestamps: true },
);

export const PlanSettings =
  mongoose.models.PlanSettings ||
  model<IPlanSettings>("PlanSettings", PlanSettingsSchema);
