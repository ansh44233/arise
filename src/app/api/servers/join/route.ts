import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteCode } = await req.json();
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Clean up code if full URL was pasted
    const cleanCode = inviteCode.trim().split('/invite/').pop()?.trim() || inviteCode.trim();

    // Find server by inviteCode or by ID
    const server = await prisma.server.findFirst({
      where: {
        OR: [
          { inviteCode: cleanCode },
          { id: cleanCode },
        ],
      },
      include: { channels: true },
    });

    if (!server) {
      return NextResponse.json({ error: 'Invalid invite code or server not found' }, { status: 404 });
    }

    // Add user as server member if not already
    try {
      await prisma.serverMember.create({
        data: {
          serverId: server.id,
          userId: auth.userId,
        },
      });
    } catch {
      /* Already a member */
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error('Join server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

