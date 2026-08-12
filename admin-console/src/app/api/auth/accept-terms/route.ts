import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, createJwtToken, getCookieDomainHeader } from '@/lib/auth';

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

    // Update user record
    const { error } = await supabase
      .from('members')
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Re-issue updated JWT token with terms_accepted = true
    const { iat, exp, nbf, ...userPayload } = user;
    const updatedPayload = { ...userPayload, terms_accepted: true };
    const newToken = createJwtToken(updatedPayload, '24h');

    const response = NextResponse.json({
      success: true,
      message: 'Terms and Conditions accepted successfully',
      user: updatedPayload,
      token: newToken
    });

    const cookieOptions = getCookieDomainHeader();
    response.headers.append('Set-Cookie', `kozker_sso_token=${newToken}; ${cookieOptions}`);

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to accept Terms & Conditions' }, { status: 500 });
  }
}
