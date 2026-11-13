import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const channels = await prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Fetch channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const { name, type } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
    }

    const channel = await prisma.channel.create({
      data: { name, type: type || 'TEXT', serverId },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
