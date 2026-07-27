import { NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const cookieHeader = request.headers.get('cookie') || '';
    let token = authHeader.replace('Bearer ', '');

    if (!token && cookieHeader) {
      const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
      if (match) token = match[1];
    }

    const user = verifyJwtToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
      urls: {
        admin_console: process.env.ADMIN_CONSOLE_URL || 'https://admin.kozker.ai',
        recruiter_app: process.env.RECRUITER_APP_URL || 'https://app.kozker.ai',
        client_portal: process.env.CLIENT_PORTAL_URL || 'https://client.kozker.ai',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
