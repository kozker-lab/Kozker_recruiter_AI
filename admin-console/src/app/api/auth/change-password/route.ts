import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword, createJwtToken, getCookieDomainHeader } from '@/lib/auth';

export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { new_password } = await request.json();
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    const password_hash = await hashPassword(new_password);

    const { error } = await supabase
      .from('members')
      .update({
        password_hash,
        must_change_password: false
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Re-issue updated JWT token
    const { iat, exp, nbf, ...userPayload } = user;
    const updatedPayload = { ...userPayload, must_change_password: false };
    const newToken = createJwtToken(updatedPayload, '24h');

    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      user: updatedPayload,
      token: newToken
    });

    const cookieOptions = getCookieDomainHeader();
    response.headers.append('Set-Cookie', `kozker_sso_token=${newToken}; ${cookieOptions}`);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update password' }, { status: 500 });
  }
}
