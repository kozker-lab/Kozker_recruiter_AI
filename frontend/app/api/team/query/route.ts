import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { recruiter_id, recruiter_name, sender_id, sender_name, message } = await request.json();

    if (!recruiter_id || !message) {
      return NextResponse.json({ error: 'Recruiter ID and message are required' }, { status: 400 });
    }

    // 1. Fetch target recruiter's organization details
    const { data: member } = await supabase
      .from('members')
      .select('organization_id, email')
      .eq('id', recruiter_id)
      .single();

    // 2. Dispatch real-time notification
    const { data: notif, error } = await supabase
      .from('notifications')
      .insert({
        recruiter_id: recruiter_id,
        organization_id: member?.organization_id || null,
        type: 'recruiter_action',
        title: `Manager Query from ${sender_name || 'Branch Manager'}`,
        message: message,
        is_read: false,
        metadata: {
          sender_id,
          sender_name,
          recruiter_name,
          category: 'manager_query'
        }
      })
      .select('*')
      .single();

    if (error) {
      console.error('Notification dispatch error:', error);
    }

    // 3. Insert into audit logs
    if (member?.organization_id) {
      await supabase.from('audit_logs').insert({
        organization_id: member.organization_id,
        actor_id: sender_id,
        actor_name: sender_name || 'Manager',
        action_description: `Sent manager query to recruiter '${recruiter_name || recruiter_id}': "${message.substring(0, 60)}..."`,
        target_name: recruiter_name || recruiter_id,
        action_type: 'update'
      });
    }

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to dispatch query' }, { status: 500 });
  }
}
