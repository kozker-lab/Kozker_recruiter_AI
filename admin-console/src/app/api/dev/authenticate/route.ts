import { NextResponse } from 'next/server';
import { validateDevAdminKey, checkDevAuthRateLimit, createJwtToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkDevAuthRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { dev_admin_key } = body;

    if (!validateDevAdminKey(dev_admin_key)) {
      return NextResponse.json(
        { error: 'Invalid Developer Master Key.', remainingAttempts: rateCheck.remaining },
        { status: 401 }
      );
    }

    // Issue Developer Session Token
    const devToken = createJwtToken(
      { role: 'developer', dev_authenticated: true },
      '4h'
    );

    return NextResponse.json({
      success: true,
      message: 'Developer Master Authentication Successful',
      dev_token: devToken
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Developer Authentication Failed' },
      { status: 500 }
    );
  }
}
