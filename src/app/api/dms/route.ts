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

// GET /api/dms?targetUserId=xxx - Get or create conversation & messages
export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');

    if (!targetUserId) {
      // List all active conversations for the user
      const conversations = await prisma.directConversation.findMany({
        where: {
          OR: [{ userOneId: auth.userId }, { userTwoId: auth.userId }],
        },
        include: {
          userOne: { select: userSelect },
          userTwo: { select: userSelect },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      return NextResponse.json(conversations);
    }

    // Get or create conversation with targetUserId
    let conversation = await prisma.directConversation.findFirst({
      where: {
        OR: [
          { userOneId: auth.userId, userTwoId: targetUserId },
          { userOneId: targetUserId, userTwoId: auth.userId },
        ],
      },
      include: {
        userOne: { select: userSelect },
        userTwo: { select: userSelect },
        messages: {
          include: {
            sender: { select: userSelect },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.directConversation.create({
        data: {
          userOneId: auth.userId,
          userTwoId: targetUserId,
        },
        include: {
          userOne: { select: userSelect },
          userTwo: { select: userSelect },
          messages: {
            include: {
              sender: { select: userSelect },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Fetch DMs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dms - Send direct message
export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId, content, fileUrl } = await req.json();
    if (!conversationId || (!content && !fileUrl)) {
      return NextResponse.json({ error: 'Missing conversationId, content or file' }, { status: 400 });
    }

    const finalContent = fileUrl ? (content && content !== '📎' ? `${content}\n${fileUrl}` : fileUrl) : content;

    const message = await prisma.directMessage.create({
      data: {
        conversationId,
        senderId: auth.userId,
        content: finalContent,
      },
      include: {
        sender: { select: userSelect },
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Send DM error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
