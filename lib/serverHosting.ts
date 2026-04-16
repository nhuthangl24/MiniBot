import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { createDeploymentFolders } from "@/services/deploymentFolders";

export const HOSTING_PERMISSIONS = [
  "console:view",
  "console:command",
  "files:view",
  "files:write",
  "files:delete",
  "startup:view",
  "startup:edit",
  "settings:view",
  "settings:edit",
  "power:start",
  "power:stop",
  "power:restart",
  "power:kill",
  "users:view",
  "users:manage",
] as const;

const LEGACY_PERMISSION_MAP: Record<string, string[]> = {
  console: ["console:view", "console:command"],
  files: ["files:view", "files:write", "files:delete"],
  startup: ["startup:view"],
  editStartup: ["startup:edit"],
  start: ["power:start", "power:stop", "power:restart"],
  settings: ["settings:view"],
  editSettings: ["settings:edit"],
  users: ["users:view"],
  manageUsers: ["users:manage"],
};

export type HostingPermission = (typeof HOSTING_PERMISSIONS)[number];

const HostingSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    containerId: String,
    sourcePath: String,
    deploymentId: String,
    planId: String,
    botName: { type: String, default: "" },
    description: { type: String, default: "" },
    startCommand: { type: String, default: "AUTO" },
    startupTemplate: String,
    envType: { type: String, default: "node:20-alpine" },
    gitRepo: { type: String, default: "" },
    gitBranch: { type: String, default: "main" },
    autoPull: { type: Boolean, default: false },
    gitUser: { type: String, default: "" },
    gitToken: { type: String, default: "" },
    sharedUsers: { type: Array, default: [] },
    updatedAt: Date,
  },
  { strict: false },
);

export const HostingModel =
  mongoose.models.Hosting || mongoose.model("Hosting", HostingSchema);

export function normalizePermissions(permissions?: string[]) {
  const expanded = new Set<HostingPermission>();

  for (const permission of permissions || []) {
    const mapped = LEGACY_PERMISSION_MAP[permission];
    if (mapped) {
      mapped.forEach((item) => expanded.add(item as HostingPermission));
      continue;
    }

    if (HOSTING_PERMISSIONS.includes(permission as HostingPermission)) {
      expanded.add(permission as HostingPermission);
    }
  }

  return Array.from(expanded);
}

export function getSessionUserId(session: any) {
  return (
    session?.user?.discordId ||
    session?.discordId ||
    session?.user?.id?.toString() ||
    session?.id?.toString() ||
    session?.user?.sub ||
    session?.sub ||
    session?.user?.email
    || session?.email
  );
}

export function getSessionNumericId(session: any, fallback?: string) {
  const primary = String(session?.user?.discordId || "").trim();
  if (/^\d+$/.test(primary)) return primary;

  const candidate = String(fallback || "").replace(/\D/g, "");
  if (candidate) return candidate;

  const emailDigits = String(session?.user?.email || "").replace(/\D/g, "");
  return emailDigits || "0";
}

export async function findHostingForUser(rawId: string, userId: string) {
  const access = await findHostingAccessForUser(rawId, userId);
  return access?.hosting || null;
}

export async function findHostingAccessForUser(rawId: string, userId: string) {
  await connectToDatabase();

  let hosting = await HostingModel.findOne({ containerId: rawId, userId });
  if (hosting) {
    return { hosting, isOwner: true, permissions: HOSTING_PERMISSIONS.slice() };
  }

  hosting = await HostingModel.findOne({ deploymentId: rawId, userId });
  if (hosting) {
    return { hosting, isOwner: true, permissions: HOSTING_PERMISSIONS.slice() };
  }

  if (mongoose.isValidObjectId(rawId)) {
    hosting = await HostingModel.findOne({ _id: rawId, userId });
    if (hosting) {
      return { hosting, isOwner: true, permissions: HOSTING_PERMISSIONS.slice() };
    }
  }

  hosting = await HostingModel.findOne({
    sharedUsers: { $elemMatch: { discordId: userId } },
    ...(mongoose.isValidObjectId(rawId)
      ? {
          $or: [{ _id: rawId }, { containerId: rawId }, { deploymentId: rawId }],
        }
      : {
          $or: [{ containerId: rawId }, { deploymentId: rawId }],
        }),
  });

  if (hosting) {
    const sharedUser = Array.isArray(hosting.sharedUsers)
      ? hosting.sharedUsers.find((item: { discordId?: string }) => item.discordId === userId)
      : null;
    return {
      hosting,
      isOwner: false,
      permissions: normalizePermissions(sharedUser?.permissions),
    };
  }

  hosting = await HostingModel.findOne({ userId });
  if (hosting) {
    return { hosting, isOwner: true, permissions: HOSTING_PERMISSIONS.slice() };
  }

  return null;
}

export function hasHostingPermission(
  permissions: string[],
  required: HostingPermission | HostingPermission[],
) {
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((permission) => permissions.includes(permission));
}

export function getNumericUserIdFromValue(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || "0";
}

export async function ensureHostingSourcePath(hosting: any) {
  if (hosting?.sourcePath) {
    return hosting.sourcePath as string;
  }

  const ownerNumericId = getNumericUserIdFromValue(hosting?.userId).substring(0, 18) || "0";
  const folders = await createDeploymentFolders(
    ownerNumericId,
    hosting?.deploymentId || hosting?._id?.toString?.() || undefined,
  );

  hosting.sourcePath = folders.sourcePath;
  hosting.deploymentId = folders.deploymentId;
  hosting.updatedAt = new Date();
  await hosting.save();

  return folders.sourcePath;
}
