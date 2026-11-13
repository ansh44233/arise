import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const roles = await prisma.serverRole.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Fetch roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { serverId } = await params;
    const { name, color, permissions } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server || server.ownerId !== auth.userId) {
      return NextResponse.json({ error: 'Only server owner can manage roles' }, { status: 403 });
    }

    const role = await prisma.serverRole.create({
      data: {
        name: name.trim(),
        color: color || '#99aab5',
        permissions: permissions || 'SEND_MESSAGES,CONNECT_VOICE',
        serverId,
      },
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
