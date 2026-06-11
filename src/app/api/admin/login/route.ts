import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ success: false, message: 'Sai mật khẩu!' }, { status: 401 });
    }

    // Set cookie on response
    const response = NextResponse.json({ success: true });
    const jwtToken = await signAdminToken();
    response.cookies.set('admin_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 tuần
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}
