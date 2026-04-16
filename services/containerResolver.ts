import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';

/**
 * Resolve the actual Docker containerId from either:
 *  - a raw Docker container ID (12+ hex chars)
 *  - a MongoDB Hosting _id
 *  - a Hosting deploymentId used by dashboard routes
 *
 * Returns null if hosting exists but has no container yet.
 * Throws if no matching hosting is found.
 */
export async function resolveContainerId(
  rawId: string,
  userId: string,
): Promise<{ containerId: string | null; hosting: any }> {
  await connectToDatabase();

  const Hosting = mongoose.models.Hosting;
  if (!Hosting) throw new Error('Hosting model not loaded');

  // Try by containerId first (Docker IDs are 64-char hex, short IDs are 12-char hex)
  const byContainer = await Hosting.findOne({ containerId: rawId, userId });
  if (byContainer) {
    return { containerId: byContainer.containerId, hosting: byContainer };
  }

  const byDeployment = await Hosting.findOne({ deploymentId: rawId, userId });
  if (byDeployment) {
    return { containerId: byDeployment.containerId || null, hosting: byDeployment };
  }

  // Try by MongoDB _id
  if (mongoose.isValidObjectId(rawId)) {
    const byId = await Hosting.findOne({ _id: rawId, userId });
    if (byId) {
      return { containerId: byId.containerId || null, hosting: byId };
    }
  }

  // Fall back: user's only hosting (single-slot model)
  const anyHosting = await Hosting.findOne({ userId });
  if (anyHosting) {
    return { containerId: anyHosting.containerId || null, hosting: anyHosting };
  }

  throw new Error('Không tìm thấy hosting của người dùng này');
}
