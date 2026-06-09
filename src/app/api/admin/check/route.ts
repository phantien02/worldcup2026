import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const c = cookies() as any;
  const cookieStore = c.then ? await c : c;
  const token = cookieStore.get('admin_token')?.value;
  return NextResponse.json({ isAdmin: token === 'authenticated' });
}
