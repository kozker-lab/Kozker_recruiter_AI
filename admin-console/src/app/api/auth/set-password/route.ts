import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { hashPassword, createJwtToken, syncSupabaseAuthUser } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: corsHeaders });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400, headers: corsHeaders });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch member from public.members
    const { data: member, error: fetchErr } = await supabase
      .from('members')
      .select('*, member_roles(role_id, roles(*))')
      .eq('email', cleanEmail)
      .single();

    if (fetchErr || !member) {
      return NextResponse.json({ error: 'Member profile not found. Please contact your organization administrator.' }, { status: 404, headers: corsHeaders });
    }

    // 2. Hash new password
    const password_hash = await hashPassword(password);

    // 3. Update public.members
    const { error: updateErr } = await supabase
      .from('members')
      .update({
        password_hash,
        must_change_password: false,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', member.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500, headers: corsHeaders });
    }

    // 4. Synchronize & Complete Supabase Auth Confirmation in auth.users
    await syncSupabaseAuthUser(cleanEmail, password);

    // 5. Generate SSO JWT Token for access to Admin Console and Recruitment Panel
    const rolesList = (member.member_roles || []).map((mr: any) => mr.roles).filter(Boolean);
    const primaryRole = rolesList[0] || {};
    const permissions = primaryRole.role_permissions ? (
      Array.isArray(primaryRole.role_permissions) ? primaryRole.role_permissions[0] : primaryRole.role_permissions
    ) : { administrator: true, access_recruitment: true };

    const token = createJwtToken({
      id: member.id,
      name: member.name,
      email: member.email,
      organization_id: member.organization_id,
      role: primaryRole.name || 'Organization Director',
      permissions
    });

    // 6. Record Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: member.organization_id,
      actor_id: member.id,
      actor_name: member.name,
      action_description: `Member '${member.name}' completed password setup and Supabase authentication confirmation`,
      target_name: member.name,
      action_type: 'auth'
    });

    return NextResponse.json({
      success: true,
      message: 'Password setup and Supabase authentication confirmed successfully!',
      token,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        organization_id: member.organization_id,
        role: primaryRole.name || 'Organization Director',
        permissions
      }
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to complete password setup' }, { status: 500, headers: corsHeaders });
  }
}
