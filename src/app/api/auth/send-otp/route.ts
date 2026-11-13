import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Global in-memory OTP store (email -> { code, expires })
const globalOtpStore = (globalThis as unknown as { otpStore?: Map<string, { code: string; expires: number }> }).otpStore || new Map();
(globalThis as unknown as { otpStore?: Map<string, { code: string; expires: number }> }).otpStore = globalOtpStore;

export async function POST(req: Request) {
  try {
    const { email, username } = await req.json();

    if (!email || !username) {
      return NextResponse.json({ error: 'Email and Username are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check if email already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email is already registered. Please sign in.' }, { status: 409 });
    }

    // Check if username already taken
    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername } },
    });
    if (existingUsername) {
      return NextResponse.json({ error: `Username "@${cleanUsername}" is already taken. Please choose another.` }, { status: 409 });
    }

    // Generate 6-digit random verification code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 mins

    globalOtpStore.set(cleanEmail, { code: otpCode, expires });

    return NextResponse.json({
      success: true,
      message: `Verification code generated for ${cleanEmail}`,
      code: otpCode,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
  }
}
