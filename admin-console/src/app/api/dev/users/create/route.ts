import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { organization_id, name, email, password, role_ids } = await request.json();

    if (!organization_id || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required member fields (organization_id, name, email, password)' }, { status: 400 });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Compute avatar initials
    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Create member (Primary Organization Admin)
    const { data: member, error } = await supabase
      .from('members')
      .insert({
        organization_id,
        name,
        email: email.toLowerCase().trim(),
        password_hash,
        avatar_initials: initials,
        must_change_password: true,
        is_primary_admin: true,
        status: 'active'
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Determine roles to assign: if provided, use role_ids; otherwise find/assign default org role
    let assignedRoleIds: string[] = Array.isArray(role_ids) && role_ids.length > 0 ? role_ids : [];

    if (assignedRoleIds.length === 0) {
      // Find default org role or create 'Organization Director'
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true });

      if (existingRoles && existingRoles.length > 0) {
        assignedRoleIds = [existingRoles[0].id];
      } else {
        const { data: newRole } = await supabase
          .from('roles')
          .insert({
            organization_id,
            name: 'Organization Director',
            level: 'org',
            color_hex: '#ff6e30'
          })
          .select('id')
          .single();

        if (newRole) {
          assignedRoleIds = [newRole.id];
          await supabase.from('role_permissions').insert({
            role_id: newRole.id,
            administrator: true,
            audit_logs: true,
            manage_server: true,
            access_recruitment: true
          });
        }
      }
    }

    if (assignedRoleIds.length > 0) {
      const roleInserts = assignedRoleIds.map((rid: string) => ({
        member_id: member.id,
        role_id: rid
      }));
      await supabase.from('member_roles').insert(roleInserts);
    }

    // Write to audit ledger
    await supabase.from('audit_logs').insert({
      organization_id,
      actor_name: 'Developer Master Key',
      action_description: `Provisioned account credentials for user ${name} (${email})`,
      target_name: name,
      action_type: 'create'
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to provision member' }, { status: 500 });
  }
}
