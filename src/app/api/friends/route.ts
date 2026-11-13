import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

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

// GET /api/friends - List friends and pending requests
export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: auth.userId }, { receiverId: auth.userId }],
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends = friendships.filter((f) => f.status === 'ACCEPTED').map((f) => {
      return f.senderId === auth.userId ? f.receiver : f.sender;
    });

    const pendingReceived = friendships.filter(
      (f) => f.status === 'PENDING' && f.receiverId === auth.userId
    );

    const pendingSent = friendships.filter(
      (f) => f.status === 'PENDING' && f.senderId === auth.userId
    );

    return NextResponse.json({ friends, pendingReceived, pendingSent });
  } catch (error) {
    console.error('Fetch friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/friends - Send friend request by username or userId
export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, userId } = await req.json();
    if (!username && !userId) return NextResponse.json({ error: 'Username or UserId is required' }, { status: 400 });

    let targetUser;
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (targetUser.id === auth.userId) {
        return NextResponse.json({ error: 'You cannot send a friend request to yourself' }, { status: 400 });
      }
    } else {
      const cleanUsername = username.trim().replace(/^@/, '');

      if (cleanUsername.toLowerCase() === auth.username.toLowerCase()) {
        return NextResponse.json({ error: 'You cannot send a friend request to yourself' }, { status: 400 });
      }

      // Ultra-flexible multi-stage user matching
      const allUsers = await prisma.user.findMany({ select: userSelect });
      const cleanSearch = cleanUsername.trim().toLowerCase();
      const alphaNumSearch = cleanSearch.replace(/[^a-z0-9]/g, '');

      // 1. Exact match (case & space trimmed)
      targetUser = allUsers.find(u => (u.username || '').trim().toLowerCase() === cleanSearch);

      // 2. Stripped @ prefix match
      if (!targetUser) {
        targetUser = allUsers.find(u => (u.username || '').trim().toLowerCase().replace(/^@/, '') === cleanSearch);
      }

      // 3. Alphanumeric match (ignores underscores, hyphens, spaces, dots)
      if (!targetUser && alphaNumSearch.length > 0) {
        targetUser = allUsers.find(u => (u.username || '').toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNumSearch);
      }

      // 4. Email match
      if (!targetUser) {
        targetUser = allUsers.find(u => (u.email || '').trim().toLowerCase() === cleanSearch);
      }

      // 5. Substring match for 3+ chars
      if (!targetUser && cleanSearch.length >= 3) {
        targetUser = allUsers.find(u => {
          const uName = (u.username || '').toLowerCase();
          return uName.includes(cleanSearch) || cleanSearch.includes(uName);
        });
      }

      if (!targetUser) {
        return NextResponse.json({ error: `User "${cleanUsername}" not found. Check the username spelling.` }, { status: 404 });
      }
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: auth.userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: auth.userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'You are already friends' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Friend request already pending' }, { status: 400 });
    }

    const isSystemBot = targetUser.username === 'Arise' || targetUser.email === 'system@arise.app';
    const friendship = await prisma.friendship.create({
      data: {
        senderId: auth.userId,
        receiverId: targetUser.id,
        status: isSystemBot ? 'ACCEPTED' : 'PENDING',
      },
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
      },
    });

    return NextResponse.json({ success: true, friendship, targetUser });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/friends - Accept or reject friend request
export async function PUT(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { friendshipId, action } = await req.json(); // action: 'ACCEPT' | 'REJECT'
    if (!friendshipId || !action) {
      return NextResponse.json({ error: 'Missing friendshipId or action' }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship || (friendship.receiverId !== auth.userId && friendship.senderId !== auth.userId)) {
      return NextResponse.json({ error: 'Friendship request not found' }, { status: 404 });
    }

    const otherUserId = friendship.senderId === auth.userId ? friendship.receiverId : friendship.senderId;

    if (action === 'ACCEPT') {
      const updated = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'ACCEPTED' },
        include: {
          sender: { select: userSelect },
          receiver: { select: userSelect },
        },
      });
      return NextResponse.json({ updated, otherUserId });
    } else {
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });
      return NextResponse.json({ success: true, message: 'Request removed', otherUserId });
    }
  } catch (error) {
    console.error('Update friendship error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
