import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Base storage root — override via STORAGE_ROOT env var.
 * Default: /storage in production, <cwd>/storage in dev.
 */
const STORAGE_ROOT =
  process.env.STORAGE_ROOT ||
  (process.env.NODE_ENV === "production"
    ? "/storage"
    : path.join(/* turbopackIgnore: true */ process.cwd(), "storage"));

/**
 * Generate a unique deployment ID.
 * Format: deploy_<timestamp>_<6 random hex chars>
 * Example: deploy_1712900000000_a3f9c2
 */
function generateDeploymentId(): string {
  const ts = Date.now();
  const rand = randomBytes(3).toString("hex");
  return `deploy_${ts}_${rand}`;
}

export interface DeploymentPaths {
  deploymentId: string;
  basePath: string; // /storage/users/{discordId}/deployments/{deploymentId}
  sourcePath: string; // .../source  — uploaded bot files live here
  logsPath: string; // .../logs    — stdout/stderr log files
  dataPath: string; // .../data    — persistent runtime data
}

/**
 * Create all deployment folders for a user.
 *
 * @param discordId  Discord snowflake ID (numbers only, never username)
 * @param customDeploymentId  Optional — pass an existing deployment ID to recreate
 *
 * @example
 * const paths = await createDeploymentFolders('123456789012345678');
 * // {
 * //   deploymentId: 'deploy_1712900000000_a3f9c2',
 * //   basePath: '/storage/users/123456789012345678/deployments/deploy_...',
 * //   sourcePath: '.../source',
 * //   logsPath: '.../logs',
 * //   dataPath: '.../data',
 * // }
 */
export async function createDeploymentFolders(
  discordId: string,
  customDeploymentId?: string,
): Promise<DeploymentPaths> {
  if (!discordId || !/^\d+$/.test(discordId)) {
    throw new Error(
      `Invalid Discord ID: "${discordId}". Must be numeric snowflake only.`,
    );
  }

  const deploymentId = customDeploymentId ?? generateDeploymentId();
  const basePath = path.join(
    STORAGE_ROOT,
    "users",
    discordId,
    "deployments",
    deploymentId,
  );
  const sourcePath = path.join(basePath, "source");
  const logsPath = path.join(basePath, "logs");
  const dataPath = path.join(basePath, "data");

  // Create all subdirectories atomically (fail-safe, idempotent)
  await Promise.all([
    fs.mkdir(sourcePath, { recursive: true }),
    fs.mkdir(logsPath, { recursive: true }),
    fs.mkdir(dataPath, { recursive: true }),
  ]);

  return { deploymentId, basePath, sourcePath, logsPath, dataPath };
}

/**
 * Get the paths for an existing deployment without creating anything.
 * Throws if the base directory does not exist.
 */
export async function getDeploymentPaths(
  discordId: string,
  deploymentId: string,
): Promise<DeploymentPaths> {
  const basePath = path.join(
    STORAGE_ROOT,
    "users",
    discordId,
    "deployments",
    deploymentId,
  );
  try {
    await fs.access(basePath);
  } catch {
    throw new Error(
      `Deployment not found: ${deploymentId} for user ${discordId}`,
    );
  }
  return {
    deploymentId,
    basePath,
    sourcePath: path.join(basePath, "source"),
    logsPath: path.join(basePath, "logs"),
    dataPath: path.join(basePath, "data"),
  };
}

/**
 * List all deployments for a user.
 * Returns empty array if user directory doesn't exist yet.
 */
export async function listUserDeployments(
  discordId: string,
): Promise<string[]> {
  const deploymentsDir = path.join(
    STORAGE_ROOT,
    "users",
    discordId,
    "deployments",
  );
  try {
    const entries = await fs.readdir(deploymentsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Delete a deployment and all its contents.
 */
export async function deleteDeploymentFolders(
  discordId: string,
  deploymentId: string,
): Promise<void> {
  const basePath = path.join(
    STORAGE_ROOT,
    "users",
    discordId,
    "deployments",
    deploymentId,
  );
  await fs.rm(basePath, { recursive: true, force: true });
}
