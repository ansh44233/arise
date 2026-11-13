import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

/** Auto-compute badges for a user based on real data */
async function computeBadges(userId: string, createdAt: Date): Promise<string> {
  const badges: string[] = [];

  try {
    // EARLY_SUPPORTER: one of first 10 registered users
    const earlyUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true },
    });
    if (earlyUsers.some(u => u.id === userId)) badges.push('EARLY_SUPPORTER');

    // STAFF: first ever registered user = admin/founder
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (firstUser?.id === userId) badges.push('STAFF');

    // OWNER: user owns at least one server
    const ownedServer = await prisma.server.findFirst({ where: { ownerId: userId }, select: { id: true } });
    if (ownedServer) badges.push('OWNER');

    // ACTIVE_DEV: user has created 2+ servers
    const serverCount = await prisma.server.count({ where: { ownerId: userId } });
    if (serverCount >= 2) badges.push('ACTIVE_DEV');

    // HYPESQUAD: user has 5+ accepted friends
    const friendCount = await prisma.friendship.count({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
      },
    });
    if (friendCount >= 5) badges.push('HYPESQUAD');

    // NITRO: sent 50+ messages
    const msgCount = await prisma.message.count({ where: { userId } });
    if (msgCount >= 50) badges.push('NITRO');
  } catch (e) {
    console.error('Badge compute error:', e);
  }

  return badges.join(',');
}

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
  createdAt: true,
};

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId') || auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: userSelect,
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Auto-compute badges (non-blocking — don't fail if it errors)
    let badges = user.badges || '';
    try {
      const computed = await computeBadges(auth.userId, user.createdAt);
      if (computed !== badges) {
        await prisma.user.update({ where: { id: auth.userId }, data: { badges: computed } });
        badges = computed;
      }
    } catch (e) {
      console.error('Badge update skipped:', e);
    }

    return NextResponse.json({ ...user, badges });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { avatarUrl, bannerUrl, about, customStatus, pronouns, accentColor } = body;

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(about !== undefined && { about }),
        ...(customStatus !== undefined && { customStatus }),
        ...(pronouns !== undefined && { pronouns }),
        ...(accentColor !== undefined && { accentColor }),
      },
      select: userSelect,
    });

    // Re-compute badges after save (non-blocking)
    let badges = updatedUser.badges || '';
    try {
      const computed = await computeBadges(auth.userId, updatedUser.createdAt);
      if (computed !== badges) {
        await prisma.user.update({ where: { id: auth.userId }, data: { badges: computed } });
        badges = computed;
      }
    } catch (e) {
      console.error('Badge update skipped:', e);
    }

    return NextResponse.json({ ...updatedUser, badges });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
