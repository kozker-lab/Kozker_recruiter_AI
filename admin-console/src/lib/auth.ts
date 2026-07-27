import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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
    // Perform dummy timing equalization to prevent length timing leakage
    crypto.timingSafeEqual(b, b);
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function createJwtToken(payload: object, expiresIn: string = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyJwtToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
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
