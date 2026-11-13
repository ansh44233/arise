import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

// Palette of accent colors for auto-avatars (Discord-style)
const AVATAR_COLORS = [
  '5865F2', // Discord Blurple
  '57F287', // Green
  'FEE75C', // Yellow
  'EB459E', // Fuchsia
  'ED4245', // Red
  '3BA55C', // Dark Green
  'F47FFF', // Pink
  '00B0F4', // Sky Blue
  'FF7043', // Deep Orange
  '9C27B0', // Purple
];

function getDefaultAvatar(username: string): string {
  // Hash username to pick a consistent color
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  // DiceBear 9.x Bottts-Neutral: cute robot avatar, unique per username
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(username)}&backgroundColor=${color}`;
}

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: 'Username must be 2–32 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email address is already registered. Please sign in.' }, { status: 409 });
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername } },
    });
    if (existingUsername) {
      return NextResponse.json({ error: `Username "@${cleanUsername}" is already taken. Please choose another.` }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const avatarUrl = getDefaultAvatar(username);

    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, avatarUrl },
    });

    // Auto-add new user to Arise Main server
    try {
      const mainServer = await prisma.server.findFirst({ where: { name: 'Arise Main' } });
      if (mainServer) {
        await prisma.serverMember.create({
          data: { serverId: mainServer.id, userId: user.id },
        });
      }
    } catch { /* ignore if already member or main server not created yet */ }

    const token = signToken({ userId: user.id, username: user.username });

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
