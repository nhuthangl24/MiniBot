import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Docker from "dockerode";
import { createDeploymentFolders } from "@/services/deploymentFolders";
import { getPlanCatalog } from "@/lib/planRuntime";
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

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

async function getLimitsForPlan(planId: string) {
  const { plans } = await getPlanCatalog();
  const plan =
    plans[planId as keyof typeof plans] || plans.free;
  return {
    limits: {
      Memory: plan.ramMb * 1024 * 1024,
      NanoCPUs: Math.round(plan.cpuCores * 1_000_000_000),
    },
  };
}

function buildStartupCommand(hosting: any) {
  const repoUrl = hosting.gitRepo || "";
  const branchName = hosting.gitBranch || "main";
  const gitUserName = hosting.gitUser || "";
  const gitToken = hosting.gitToken || "";
  const autoPull = hosting.autoPull ? "1" : "0";
  const userCmd = hosting.startCommand || DEFAULT_START_COMMAND;
  const rawTemplate = resolveStartupTemplate(
    hosting.startupTemplate || DEFAULT_STARTUP_TEMPLATE,
  );

  return rawTemplate
    .replace(/\$AUTO_PULL/g, autoPull)
    .replace(/\$GIT_ADDRESS/g, repoUrl)
    .replace(/\$GIT_USER/g, gitUserName)
    .replace(/\$GIT_TOKEN/g, gitToken)
    .replace(/\$BRANCH/g, branchName)
    .replace(/\{\{STARTUPSCRIPT\}\}/g, userCmd);
}

async function createHostingContainer(hosting: any, userId: string, discordId: string) {
  const folders = await createDeploymentFolders(
    discordId.substring(0, 18) || "000",
    hosting.deploymentId || hosting._id.toString(),
  );

  const image = hosting.envType || "node:20-alpine";
  const fullStartupCommand = buildStartupCommand(hosting);

  try {
    await new Promise<void>((resolve) => {
      docker.pull(image, (err: any, stream: any) => {
        if (err || !stream) {
          resolve();
          return;
        }
        docker.modem.followProgress(stream, () => resolve());
      });
    });
  } catch {}

  const planLimits = (await getLimitsForPlan(hosting.planId)).limits;

  const container = await docker.createContainer({
    Image: image,
    Cmd: ["/bin/sh", "-c", fullStartupCommand],
    name: `minibot_${hosting._id.toString().substring(0, 8)}_${Date.now()}`,
    WorkingDir: "/home/container",
    HostConfig: {
      Binds: [`${folders.sourcePath}:/home/container`],
      Memory: planLimits.Memory,
      NanoCpus: planLimits.NanoCPUs,
      NetworkMode: "bridge",
      RestartPolicy: { Name: "unless-stopped" },
    },
    Labels: {
      "minibot.userId": userId,
      "minibot.hostingId": hosting._id.toString(),
      "minibot.startupTemplateVersion": STARTUP_TEMPLATE_VERSION,
    },
  });

  hosting.containerId = container.id;
  hosting.deploymentId = folders.deploymentId;
  hosting.sourcePath = folders.sourcePath;
  await hosting.save();

  return { container, folders };
}

async function recreateContainerIfOutdated(
  hosting: any,
  userId: string,
  discordId: string,
) {
  if (!hosting.containerId) {
    return { container: null, recreated: false };
  }

  const existingContainer = docker.getContainer(hosting.containerId);
  const inspect = await existingContainer.inspect();
  const currentVersion =
    inspect.Config?.Labels?.["minibot.startupTemplateVersion"] || "";

  if (currentVersion === STARTUP_TEMPLATE_VERSION) {
    return { container: existingContainer, recreated: false };
  }

  try {
    await existingContainer.remove({ force: true });
  } catch {}

  const { container } = await createHostingContainer(hosting, userId, discordId);
  return { container, recreated: true };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const { action } = await req.json();
  const userId = getSessionUserId(session);

  const access = await findHostingAccessForUser(rawId, userId);
  if (!access) {
    return NextResponse.json(
      { error: "Không tìm thấy hosting" },
      { status: 404 },
    );
  }
  const { hosting } = access;

  const actionPermissionMap = {
    provision: "power:start",
    start: "power:start",
    stop: "power:stop",
    restart: "power:restart",
    kill: "power:kill",
    reinstall: "power:restart",
    delete: "power:kill",
  } as const;

  const requiredPermission = actionPermissionMap[action as keyof typeof actionPermissionMap];
  if (
    requiredPermission &&
    !access.isOwner &&
    !hasHostingPermission(access.permissions, requiredPermission)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ---- PROVISION: first-time container creation ----
  if (
    action === "provision" ||
    (!hosting.containerId && (action === "start" || action === "reinstall"))
  ) {
    try {
      const discordId = getSessionNumericId(session, userId);
      const { container, folders } = await createHostingContainer(
        hosting,
        userId,
        discordId,
      );
      await container.start();

      return NextResponse.json({
        success: true,
        containerId: container.id,
        deploymentId: folders.deploymentId,
        paths: {
          source: folders.sourcePath,
          logs: folders.logsPath,
          data: folders.dataPath,
        },
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: `Provision failed: ${err.message}` },
        { status: 500 },
      );
    }
  }

  // ---- Need a container to do anything else ----
  if (!hosting.containerId) {
    return NextResponse.json(
      {
        error:
          'Container chưa được khởi tạo. Bấm "Khởi tạo Container" để bắt đầu.',
        needsProvision: true,
      },
      { status: 400 },
    );
  }

  const containerId = hosting.containerId;

  try {
    let container = docker.getContainer(containerId);

    // Always enforce the limits of the current plan on every action
    const planLimits = (await getLimitsForPlan(hosting.planId)).limits;
    try {
      await container.update({
        Memory: planLimits.Memory,
        NanoCPUs: planLimits.NanoCPUs,
      });
    } catch (e: any) {
      /* Ignore if it cannot be updated while running or similar */
    }

    switch (action) {
      case "start":
        {
          const upgraded = await recreateContainerIfOutdated(
          hosting,
          userId,
          getSessionNumericId(session, userId),
          );
          container = upgraded.container || container;
        }
        try {
          await container.start();
        } catch (e: any) {
          if (e.statusCode !== 304) throw e;
        }
        break;
      case "stop":
        await container.stop({ t: 10 });
        break;
      case "restart":
        {
          const upgraded = await recreateContainerIfOutdated(
          hosting,
          userId,
          getSessionNumericId(session, userId),
          );
          container = upgraded.container || container;
          if (upgraded.recreated) {
            await container.start();
          } else {
            await container.restart({ t: 10 });
          }
        }
        break;
      case "kill":
        await container.kill();
        break;
      case "delete":
        await container.remove({ force: true });
        hosting.containerId = null;
        await hosting.save();
        break;
      case "reinstall":
        // Stop + remove + reprovision
        try {
          await container.remove({ force: true });
        } catch {}
        hosting.containerId = null;
        await hosting.save();
        // Re-trigger provision
        const discordId = getSessionNumericId(session, userId);
        const { container: newContainer } = await createHostingContainer(
          hosting,
          userId,
          discordId,
        );
        await newContainer.start();
        return NextResponse.json({
          success: true,
          containerId: newContainer.id,
        });

      default:
        return NextResponse.json(
          { error: "Hành động không hợp lệ" },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      // Container was deleted externally — clear the reference
      hosting.containerId = null;
      await hosting.save();
      return NextResponse.json(
        {
          error: "Container không còn tồn tại. Vui lòng khởi tạo lại.",
          needsProvision: true,
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
