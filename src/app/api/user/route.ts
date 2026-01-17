
import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions } from '@/lib/session';

export async function GET() {
  const session = await getIronSession(cookies(), sessionOptions);

  if (!session.user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: session.user });
}
