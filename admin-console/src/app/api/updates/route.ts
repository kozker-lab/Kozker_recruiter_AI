import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: updates, error } = await supabase
      .from('rolling_updates')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updates: updates || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch platform updates' }, { status: 500 });
  }
}
