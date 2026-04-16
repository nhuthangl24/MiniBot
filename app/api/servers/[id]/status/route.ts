import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Docker from "dockerode";
import {
  findHostingAccessForUser,
  getSessionUserId,
  hasHostingPermission,
} from "@/lib/serverHosting";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: rawId } = await params;
  const userId = getSessionUserId(session);

  const access = await findHostingAccessForUser(rawId, userId);
  if (!access) {
    return NextResponse.json({ status: "offline", details: null });
  }
  if (
    !access.isOwner &&
    ![
      "console:view",
      "files:view",
      "startup:view",
      "settings:view",
      "users:view",
      "power:start",
      "power:stop",
      "power:restart",
      "power:kill",
    ].some((permission) => hasHostingPermission(access.permissions, permission as any))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!access.hosting.containerId) {
    return NextResponse.json({ status: "offline", details: null });
  }

  try {
    const container = docker.getContainer(access.hosting.containerId);
    const info = await container.inspect();
    return NextResponse.json({
      status: info.State.Running
        ? "running"
        : info.State.Restarting
          ? "starting"
          : "offline",
      details: info,
    });
  } catch (error: any) {
    if (error.statusCode === 404) {
      return NextResponse.json({ status: "offline", details: null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
