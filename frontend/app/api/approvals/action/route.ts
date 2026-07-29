import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { approval_id, action, reviewer_notes } = await request.json();

    if (!approval_id || !action) {
      return NextResponse.json({ error: 'Approval ID and action status are required' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('pending_approvals')
      .update({
        status: action,
        updated_at: new Date().toISOString()
      })
      .eq('id', approval_id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, approval: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval action' }, { status: 500 });
  }
}
