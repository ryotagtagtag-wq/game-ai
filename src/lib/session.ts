/** セッション管理 (HttpOnly Cookie + KV) */

import { generateId } from './crypto';
import type { Env, Session, UserRole } from '../shared';

const SESSION_COOKIE_NAME = 'ai_game_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30日
const SESSION_PREFIX = 'session:';

export function createSessionCookie(sessionId: string, isProduction: boolean): string {
  const secure = isProduction ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; ${secure}Path=/; Max-Age=${SESSION_TTL}`;
}

export function clearSessionCookie(isProduction: boolean): string {
  const secure = isProduction ? 'Secure; ' : '';
  return `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Lax; ${secure}Path=/; Max-Age=0`;
}

export async function createSession(
  env: Env,
  userId: string,
  role: UserRole,
  lectureId?: string
): Promise<string> {
  const sessionId = generateId('sess_');
  const session: Session = {
    sessionId,
    userId,
    role,
    lectureId,
    expiresAt: Date.now() + SESSION_TTL * 1000,
  };
  await env.GAME_KV.put(SESSION_PREFIX + sessionId, JSON.stringify(session), {
    expirationTtl: SESSION_TTL,
  });
  return sessionId;
}

export async function getSession(env: Env, sessionId: string): Promise<Session | null> {
  const data = await env.GAME_KV.get(SESSION_PREFIX + sessionId);
  if (!data) return null;
  try {
    const session = JSON.parse(data) as Session;
    if (session.expiresAt < Date.now()) {
      await env.GAME_KV.delete(SESSION_PREFIX + sessionId);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await env.GAME_KV.delete(SESSION_PREFIX + sessionId);
}

export function getSessionIdFromCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}