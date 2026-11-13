import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

const userSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  bannerUrl: true,
  about: true,
  badges: true,
  customStatus: true,
  pronouns: true,
  accentColor: true,
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { serverId } = await params;

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: {
        owner: { select: userSelect },
        members: {
          include: {
            user: { select: userSelect },
          },
        },
      },
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // For Arise Main (public community server), return all registered users so everyone sees all members!
    let allMembers = [];
    if (server.name === 'Arise Main') {
      allMembers = await prisma.user.findMany({
        select: userSelect,
        orderBy: { createdAt: 'asc' },
      });
    } else {
      const memberUsers = server.members.map(m => m.user);
      if (server.owner && !memberUsers.some(m => m.id === server.owner.id)) {
        memberUsers.unshift(server.owner);
      }
      allMembers = memberUsers;
    }

    return NextResponse.json(allMembers);
  } catch (error) {
    console.error('Fetch server members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
