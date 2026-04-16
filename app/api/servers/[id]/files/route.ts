import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import {
  ensureHostingSourcePath,
  findHostingAccessForUser,
  getSessionUserId,
  hasHostingPermission,
} from "@/lib/serverHosting";

function getSafeRelativePath(requestPath: string) {
  const normalized = path.posix.normalize(`/${requestPath || "/"}`);
  return normalized.replace(/^\/+/, "");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: serverId } = await params;
  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(serverId, userId);

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, "files:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sourcePath = await ensureHostingSourcePath(access.hosting);

  const { searchParams } = new URL(req.url);
  const relativePath = getSafeRelativePath(searchParams.get("path") || "/");
  const targetPath = path.join(sourcePath, relativePath);

  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      // It's a file, return its contents
      try {
        const content = await fs.readFile(targetPath, "utf-8");
        return NextResponse.json({ content, isFile: true });
      } catch (err) {
        return NextResponse.json(
          { error: "Cannot read file" },
          { status: 400 },
        );
      }
    }

    const files = await fs.readdir(targetPath, { withFileTypes: true });
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(targetPath, file.name);
        const fileStats = await fs.stat(filePath).catch(() => null);
        return {
          name: file.name,
          isDirectory: file.isDirectory(),
          size: fileStats?.size || 0,
          lastModified: fileStats?.mtime || new Date(),
        };
      }),
    );

    return NextResponse.json({ files: fileList });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return NextResponse.json({ files: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: serverId } = await params;
  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(serverId, userId);

  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const sourcePath = await ensureHostingSourcePath(access.hosting);

  const contentType = req.headers.get("content-type") || "";

  // ---- Multipart file upload ----
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const uploadPath = (formData.get("path") as string) || "/";
      if (!file)
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 },
        );
      if (!access.isOwner && !hasHostingPermission(access.permissions, "files:write")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const safePath = getSafeRelativePath(uploadPath);
      const targetDir = path.join(sourcePath, safePath);
      await fs.mkdir(targetDir, { recursive: true });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const targetFile = path.join(targetDir, file.name);
      await fs.writeFile(targetFile, buffer);
      return NextResponse.json({ success: true, name: file.name });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ---- JSON actions ----
  const body = await req.json();
  const { filePath, content, action } = body;

  const safePath = getSafeRelativePath(filePath || "");
  const targetFile = path.join(sourcePath, safePath);

  try {
    if (action === "create_folder") {
      if (!access.isOwner && !hasHostingPermission(access.permissions, "files:write")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await fs.mkdir(targetFile, { recursive: true });
      return NextResponse.json({ success: true });
    }
    if (action === "delete") {
      if (!access.isOwner && !hasHostingPermission(access.permissions, "files:delete")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const stats = await fs.stat(targetFile);
      if (stats.isDirectory()) {
        await fs.rm(targetFile, { recursive: true, force: true });
      } else {
        await fs.unlink(targetFile);
      }
      return NextResponse.json({ success: true });
    }

    if (!access.isOwner && !hasHostingPermission(access.permissions, "files:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, content || "");
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
