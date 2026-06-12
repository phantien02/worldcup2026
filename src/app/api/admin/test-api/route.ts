import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.API_SPORTS_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'Chưa cấu hình API_SPORTS_KEY trên Vercel (bị null hoặc rỗng).' });
  }

  try {
    const response = await fetch('https://v3.football.api-sports.io/status', {
      headers: {
        'x-apisports-key': apiKey
      }
    });
    
    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      return NextResponse.json({ success: false, message: JSON.stringify(data.errors) });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message });
  }
}
