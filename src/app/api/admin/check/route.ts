import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/lib/jwt';

export async function GET() {
  const c = cookies() as any;
  const cookieStore = c.then ? await c : c;
  const token = cookieStore.get('admin_token')?.value;
  if (!token) return NextResponse.json({ isAdmin: false });
  const isAdmin = await verifyAdminToken(token);
  return NextResponse.json({ isAdmin });
}
