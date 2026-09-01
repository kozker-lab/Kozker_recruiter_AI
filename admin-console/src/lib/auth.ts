import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from './db';

const DEV_ADMIN_KEY_DEFAULT = "a7f9b8c2d1e0456789abcde0123456789abcdef0123456789abcdef0123456789";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-shared-key-change-in-production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ".kozker.ai";

// Rate-limiter store for Dev Auth: IP -> { count, expiresAt }
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

export function checkDevAuthRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimitStore.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return { allowed: true, remaining: 2 };
  }

  if (entry.count >= 3) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
  return { allowed: true, remaining: 3 - entry.count };
}

export function validateDevAdminKey(inputKey: string): boolean {
  if (!inputKey || typeof inputKey !== 'string') return false;
  const masterKey = process.env.DEV_ADMIN_KEY || DEV_ADMIN_KEY_DEFAULT;

  const a = Buffer.from(inputKey);
  const b = Buffer.from(masterKey);

  if (a.length !== b.length) {
    crypto.timingSafeEqual(b, b);
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function createJwtToken(payload: object, expiresIn: string = '24h'): string {
  const cleanPayload = { ...payload };
  delete (cleanPayload as any).iat;
  delete (cleanPayload as any).exp;
  delete (cleanPayload as any).nbf;
  return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyJwtToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(request: Request): Promise<any> {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  const devKeyHeader = request.headers.get('x-dev-admin-key') || '';
  const xUserEmailHeader = request.headers.get('x-user-email') || '';

  // 1. Try JWT token verification
  let token = authHeader.replace('Bearer ', '');
  if (!token && cookieHeader) {
    const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (token) {
    const jwtUser = verifyJwtToken(token);
    if (jwtUser) return jwtUser;
  }

  // 2. Try Dev Admin Key header
  if (devKeyHeader && validateDevAdminKey(devKeyHeader)) {
    return {
      id: "master_dev_admin",
      name: "Master Developer Admin",
      email: "smaranlm10@gmail.com",
      organization_id: "178689b9-363e-4e30-b767-14764a2adeb5",
      is_primary_admin: true,
      permissions: {
        administrator: true,
        recruiter: true,
        client_admin: true,
        finance_billing: true
      }
    };
  }

  // 3. Fallback: Resolve user by email cookie or header or default admin
  let email = xUserEmailHeader.trim().toLowerCase();
  if (!email && cookieHeader) {
    const match = cookieHeader.match(/kozker_user_email=([^;]+)/);
    if (match) email = decodeURIComponent(match[1]).trim().toLowerCase();
  }
  if (!email) {
    email = "smaranlm10@gmail.com";
  }

  try {
    const { data: member } = await supabase
      .from('members')
      .select('*, member_roles(role_id, roles(*))')
      .ilike('email', email)
      .single();

    if (member) {
      let isPrimary = false;
      let perms: Record<string, boolean> = { administrator: true };

      if (member.member_roles && Array.isArray(member.member_roles)) {
        for (const mr of member.member_roles) {
          if (mr.roles) {
            if (mr.roles.is_primary_admin) isPrimary = true;
            if (mr.roles.permissions) {
              perms = { ...perms, ...mr.roles.permissions };
            }
          }
        }
      }

      return {
        id: member.id,
        name: member.name || "Smaran Devaki",
        email: member.email,
        organization_id: member.organization_id || "178689b9-363e-4e30-b767-14764a2adeb5",
        is_primary_admin: isPrimary || true,
        permissions: perms
      };
    }
  } catch (err) {
    console.error("Error resolving member by email:", err);
  }

  return {
    id: "8cebc388-e69b-497d-955a-2653b534f1c1",
    name: "Smaran Devaki",
    email: "smaranlm10@gmail.com",
    organization_id: "178689b9-363e-4e30-b767-14764a2adeb5",
    is_primary_admin: true,
    permissions: {
      administrator: true,
      recruiter: true,
      client_admin: true,
      finance_billing: true
    }
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getCookieDomainHeader(): string {
  if (process.env.NODE_ENV === 'production') {
    return `Domain=${COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  }
  return `Path=/; HttpOnly; SameSite=Lax`;
}

/**
 * Synchronizes user credentials with Supabase GoTrue Auth (auth.users)
 */
export async function syncSupabaseAuthUser(email: string, password: string): Promise<void> {
  try {
    if (!supabase.auth?.admin) return;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Try creating fresh user in auth.users
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true
    });

    if (!createErr && createData?.user) {
      return;
    }

    // 2. If user already exists in auth.users, retrieve user ID via recovery link generator & update password
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail
    });

    if (linkData?.user?.id) {
      await supabase.auth.admin.updateUserById(linkData.user.id, {
        password: password,
        email_confirm: true
      });
    }
  } catch (err) {
    console.error('Supabase Auth user sync error (non-fatal):', err);
  }
}
