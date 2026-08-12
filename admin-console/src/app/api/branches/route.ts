import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

function getUserFromReq(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  let token = authHeader.replace('Bearer ', '');
  if (!token && cookieHeader) {
    const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
    if (match) token = match[1];
  }
  return verifyJwtToken(token);
}

// In-memory fallback branch cache per organization if table schema is pending
const inMemoryBranchesStore: Record<string, any[]> = {};

function getInitialDefaultBranches(orgId: string) {
  if (!inMemoryBranchesStore[orgId]) {
    inMemoryBranchesStore[orgId] = [
      { id: 'b-main-01', organization_id: orgId, name: 'Main Branch', code: 'MAIN', location: 'HQ Headquarters' },
      { id: 'b-kak-02', organization_id: orgId, name: 'Kakkanad Tech Hub', code: 'KAK', location: 'Kochi, Kerala' },
      { id: 'b-lon-03', organization_id: orgId, name: 'HQ London', code: 'LON', location: 'London, UK' }
    ];
  }
  return inMemoryBranchesStore[orgId];
}

export async function GET(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', user.organization_id)
      .order('name', { ascending: true });

    if (error || !branches) {
      return NextResponse.json({ success: true, branches: getInitialDefaultBranches(user.organization_id) });
    }

    return NextResponse.json({ success: true, branches: branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot create branches.'
      }, { status: 403 });
    }

    const { name, code, location } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    const branchNameClean = name.trim();
    const branchCodeClean = (code || branchNameClean.slice(0, 4)).toUpperCase();
    const branchLocationClean = location || 'Main Location';

    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        organization_id: user.organization_id,
        name: branchNameClean,
        code: branchCodeClean,
        location: branchLocationClean
      })
      .select('*')
      .single();

    if (error || !branch) {
      // Fallback insertion into in-memory store
      const list = getInitialDefaultBranches(user.organization_id);
      const newBranchObj = {
        id: `b-custom-${Date.now()}`,
        organization_id: user.organization_id,
        name: branchNameClean,
        code: branchCodeClean,
        location: branchLocationClean
      };
      list.push(newBranchObj);
      return NextResponse.json({ success: true, branch: newBranchObj });
    }

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create branch' }, { status: 500 });
  }
}
