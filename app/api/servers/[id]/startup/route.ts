import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  DEFAULT_STARTUP_TEMPLATE,
  DEFAULT_START_COMMAND,
  STARTUP_TEMPLATE_VERSION,
  resolveStartupTemplate,
} from "@/lib/startupTemplate";
import {
  findHostingAccessForUser,
  getSessionNumericId,
  getSessionUserId,
  hasHostingPermission,
} from "@/lib/serverHosting";
import { createDeploymentFolders } from "@/services/deploymentFolders";
import { detectStartupFromSource } from "@/lib/startupDetect";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(rawId, userId);
  if (!access)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.isOwner && !hasHostingPermission(access.permissions, "startup:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { hosting } = access;

  return NextResponse.json({
    startCommand: hosting.startCommand || DEFAULT_START_COMMAND,
    startupTemplate: resolveStartupTemplate(
      hosting.startupTemplate || DEFAULT_STARTUP_TEMPLATE,
    ),
    envType: hosting.envType || "node:20-alpine",
    gitRepo: hosting.gitRepo || "",
    gitBranch: hosting.gitBranch || "main",
    autoPull: Boolean(hosting.autoPull),
    gitUser: hosting.gitUser || "",
    gitToken: hosting.gitToken || "",
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getSessionUserId(session);

  const {
    startCommand,
    startupTemplate,
    envType,
    gitRepo,
    gitBranch,
    autoPull,
    gitUser,
    gitToken,
  } = await req.json();

  const access = await findHostingAccessForUser(rawId, userId);

  if (access) {
    if (!access.isOwner && !hasHostingPermission(access.permissions, "startup:edit")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { hosting } = access;
    hosting.startCommand = startCommand || DEFAULT_START_COMMAND;
    if (startupTemplate !== undefined)
      hosting.startupTemplate = resolveStartupTemplate(startupTemplate);
    if (envType) hosting.envType = envType;
    if (gitRepo !== undefined) hosting.gitRepo = gitRepo;
    if (gitBranch !== undefined) hosting.gitBranch = gitBranch;
    if (autoPull !== undefined) hosting.autoPull = autoPull;
    if (gitUser !== undefined) hosting.gitUser = gitUser;
    if (gitToken !== undefined) hosting.gitToken = gitToken;
    hosting.updatedAt = new Date();
    await hosting.save();

    // Recreate container if it exists so new command takes effect
    if (hosting.containerId) {
      try {
        const Docker = (await import("dockerode")).default;
        const docker = new Docker({ socketPath: "/var/run/docker.sock" });
        const container = docker.getContainer(hosting.containerId);

        try {
          await container.remove({ force: true });
        } catch (e) {}

        const discordId = getSessionNumericId(session, userId).substring(0, 18) || "0";
        const { createDeploymentFolders } =
          await import("@/services/deploymentFolders");
        const folders = await createDeploymentFolders(
          discordId,
          hosting.deploymentId || hosting._id.toString(),
        );

        const repoUrl = hosting.gitRepo || "";
        const branchName = hosting.gitBranch || "main";
        const gitUserName = hosting.gitUser || "";
        const gitToken = hosting.gitToken || "";
        const isAutoPull = hosting.autoPull ? "1" : "0";
        const userCmd = hosting.startCommand || DEFAULT_START_COMMAND;
        const rawTemplate = resolveStartupTemplate(
          hosting.startupTemplate || DEFAULT_STARTUP_TEMPLATE,
        );

        // Apply variables literally to the shell string without risking bash interpolation bugs
        const fullStartupCommand = rawTemplate
          .replace(/\$AUTO_PULL/g, isAutoPull)
          .replace(/\$GIT_ADDRESS/g, repoUrl)
          .replace(/\$GIT_USER/g, gitUserName)
          .replace(/\$GIT_TOKEN/g, gitToken)
          .replace(/\$BRANCH/g, branchName)
          .replace(/\{\{STARTUPSCRIPT\}\}/g, userCmd);

        const newContainer = await docker.createContainer({
          Image: hosting.envType || "node:20-alpine",
          Cmd: ["/bin/sh", "-c", fullStartupCommand],
          name: `minibot_${hosting._id.toString().substring(0, 8)}_r${Date.now()}`,
          WorkingDir: "/home/container",
          HostConfig: {
            Binds: [`${folders.sourcePath}:/home/container`],
            Memory: 512 * 1024 * 1024,
            NanoCpus: 500_000_000,
            NetworkMode: "bridge",
            RestartPolicy: { Name: "unless-stopped" },
          },
          Labels: {
            "minibot.userId": userId,
            "minibot.hostingId": hosting._id.toString(),
            "minibot.startupTemplateVersion": STARTUP_TEMPLATE_VERSION,
          },
        });

        hosting.containerId = newContainer.id;
        await hosting.save();
        await newContainer.start();
      } catch (err) {
        console.error("Error recreating container for new command:", err);
      }
    }
  }

  return NextResponse.json({ success: true, message: "Startup updated" });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(rawId, userId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, "startup:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { hosting } = access;

  let sourcePath = hosting.sourcePath as string | undefined;
  if (!sourcePath) {
    const discordId = getSessionNumericId(session, userId).substring(0, 18) || "0";
    const folders = await createDeploymentFolders(
      discordId,
      hosting.deploymentId || hosting._id.toString(),
    );
    sourcePath = folders.sourcePath;
    hosting.sourcePath = folders.sourcePath;
    hosting.deploymentId = folders.deploymentId;
    await hosting.save();
  }

  const detected = await detectStartupFromSource(sourcePath);
  return NextResponse.json(detected);
}
