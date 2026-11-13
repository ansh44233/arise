import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find or seed default Arise Main server if DB is empty
    let allServersCount = await prisma.server.count();
    if (allServersCount === 0) {
      let systemUser = await prisma.user.findUnique({ where: { email: 'system@arise.app' } });
      if (!systemUser) {
        const { hashPassword } = await import('@/lib/auth');
        systemUser = await prisma.user.create({
          data: {
            email: 'system@arise.app',
            username: 'Arise',
            password: await hashPassword(Math.random().toString(36)),
            avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=arise-system`,
          },
        });
      }
      const inviteCode = Math.random().toString(36).substring(2, 10);
      await prisma.server.create({
        data: {
          name: 'Arise Main',
          inviteCode,
          ownerId: systemUser.id,
          channels: {
            create: [
              { name: 'general', type: 'TEXT' },
              { name: 'lounge', type: 'TEXT' },
              { name: 'General Voice', type: 'VOICE' },
            ],
          },
          members: {
            create: [
              { userId: systemUser.id },
              { userId: auth.userId },
            ],
          },
        },
      });
    }

    // Auto-add user to Arise Main server if they have 0 servers
    let userServers = await prisma.server.findMany({
      where: {
        OR: [
          { ownerId: auth.userId },
          { members: { some: { userId: auth.userId } } },
        ],
      },
      include: { channels: true },
      orderBy: { createdAt: 'asc' },
    });

    if (userServers.length === 0) {
      const mainServer = await prisma.server.findFirst({
        where: { name: 'Arise Main' },
        include: { channels: true },
      });
      if (mainServer) {
        try {
          await prisma.serverMember.create({
            data: { serverId: mainServer.id, userId: auth.userId },
          });
        } catch { /* already member */ }
        userServers = [mainServer];
      }
    }

    return NextResponse.json(userServers);
  } catch (error) {
    console.error('Fetch servers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }

    const inviteCode = Math.random().toString(36).substring(2, 10);

    const server = await prisma.server.create({
      data: {
        name,
        inviteCode,
        ownerId: auth.userId,
        channels: {
          create: [
            { name: 'general', type: 'TEXT' },
            { name: 'voice-lounge', type: 'VOICE' },
          ],
        },
        members: {
          create: [{ userId: auth.userId }],
        },
      },
      include: { channels: true },
    });

    return NextResponse.json(server);
  } catch (error: any) {
    console.error('Create server error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

