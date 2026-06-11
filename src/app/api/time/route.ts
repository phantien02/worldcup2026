import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ serverTime: new Date().toISOString() }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
