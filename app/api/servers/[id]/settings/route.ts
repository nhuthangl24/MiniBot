import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  findHostingAccessForUser,
  getSessionUserId,
  hasHostingPermission,
} from '@/lib/serverHosting';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = getSessionUserId(session);
  const access = await findHostingAccessForUser(id, userId);

  if (!access) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, 'settings:view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    botName: access.hosting.botName || '',
    description: access.hosting.description || '',
    hostingId: access.hosting._id.toString(),
    containerId: access.hosting.containerId || null,
    isOwner: access.isOwner,
    permissions: access.permissions,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = getSessionUserId(session);

  const body = await req.json();
  const { botName, description } = body;

  const access = await findHostingAccessForUser(id, userId);
  if (!access) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!access.isOwner && !hasHostingPermission(access.permissions, 'settings:edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  access.hosting.botName = botName ?? access.hosting.botName ?? '';
  access.hosting.description = description ?? access.hosting.description ?? '';
  access.hosting.updatedAt = new Date();
  await access.hosting.save();

  return NextResponse.json({ success: true, hostingId: access.hosting._id.toString() });
}
