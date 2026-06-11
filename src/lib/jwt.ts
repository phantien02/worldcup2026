import { SignJWT, jwtVerify } from 'jose';

// Sử dụng ADMIN_PASSWORD làm secret key luôn cho tiện, hoặc bạn có thể tạo một JWT_SECRET riêng trong .env
const getSecretKey = () => new TextEncoder().encode(process.env.ADMIN_PASSWORD || 'fallback_secret_do_not_use_in_prod');

export async function signAdminToken() {
  const secretKey = getSecretKey();
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyAdminToken(token: string) {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === 'admin';
  } catch (err) {
    return false;
  }
}
