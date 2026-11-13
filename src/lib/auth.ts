import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'arise-secret-fresh-reset-2026';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; username: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
}

export function getUserFromRequest(req: Request): { userId: string; username: string } | null {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(req: Request) {
  const tokenUser = getUserFromRequest(req);
  if (!tokenUser) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: tokenUser.userId } });
  if (!dbUser) return null;
  return { userId: dbUser.id, username: dbUser.username, user: dbUser };
}

