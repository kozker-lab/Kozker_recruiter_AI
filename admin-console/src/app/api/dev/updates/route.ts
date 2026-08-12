import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { version_tag, title, description, category, priority } = await request.json();

    if (!version_tag || !title || !description) {
      return NextResponse.json({ error: 'Missing required update fields (version_tag, title, description)' }, { status: 400 });
    }

    const { data: update, error } = await supabase
      .from('rolling_updates')
      .insert({
        version_tag,
        title,
        description,
        category: category || 'Feature Release',
        priority: priority || 'Normal'
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Platform rolling update broadcasted successfully', update });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to broadcast update' }, { status: 500 });
  }
}
