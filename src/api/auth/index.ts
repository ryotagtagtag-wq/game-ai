/** 認証関連 API */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyPassword, hashPassword, generateId } from '../../lib/crypto';
import { createSession, deleteSession, getSessionIdFromCookie, createSessionCookie, clearSessionCookie } from '../../lib/session';
import { kvPut } from '../../lib/kv';
import type { Env, Teacher, SystemAdmin } from '../../shared';

const auth = new Hono<{ Bindings: Env }>();

// セッション取得ヘルパー
async function getCurrentSession(c: any): Promise<{ sessionId: string; userId: string; role: string } | null> {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));
  if (!sessionId) return null;
  const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json');
  return session as { sessionId: string; userId: string; role: string } | null;
}

// 教師ログイン
auth.post('/teacher/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) throw new HTTPException(400, { message: 'メールアドレスとパスワードを入力してください' });

  const teacher = await c.env.GAME_KV.get(`teacher:email:${email}`, 'json') as Teacher | null;
  if (!teacher) throw new HTTPException(401, { message: 'メールアドレスまたはパスワードが正しくありません' });

  const valid = await verifyPassword(password, teacher.passwordHash);
  if (!valid) throw new HTTPException(401, { message: 'メールアドレスまたはパスワードが正しくありません' });

  if (teacher.status === 'pending') throw new HTTPException(403, { message: '審査中です。承認までお待ちください' });
  if (teacher.status === 'rejected') throw new HTTPException(403, { message: `申請が却下されました。理由: ${teacher.reviewNote || '不明'}` });

  const sessionId = await createSession(c.env, teacher.id, 'teacher');
  const cookie = createSessionCookie(sessionId, c.env.ENVIRONMENT === 'production');

  return c.json(
    { success: true, teacher: { id: teacher.id, email: teacher.email, lectureName: teacher.lectureName } },
    200,
    { 'Set-Cookie': cookie }
  );
});

// 管理者ログイン
auth.post('/admin/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) throw new HTTPException(400, { message: 'メールアドレスとパスワードを入力してください' });

  if (email !== c.env.ADMIN_EMAIL) throw new HTTPException(401, { message: '認証に失敗しました' });

  const valid = await verifyPassword(password, c.env.ADMIN_PASSWORD_HASH);
  if (!valid) throw new HTTPException(401, { message: '認証に失敗しました' });

  const sessionId = await createSession(c.env, 'admin', 'admin');
  const cookie = createSessionCookie(sessionId, c.env.ENVIRONMENT === 'production');

  return c.json({ success: true }, 200, { 'Set-Cookie': cookie });
});

// ログアウト
auth.post('/logout', async (c) => {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));
  if (sessionId) await deleteSession(c.env, sessionId);
  const cookie = clearSessionCookie(c.env.ENVIRONMENT === 'production');
  return c.json({ success: true }, 200, { 'Set-Cookie': cookie });
});

// 現在のユーザー取得
auth.get('/me', async (c) => {
  const session = await getCurrentSession(c);
  if (!session) throw new HTTPException(401, { message: '未ログイン' });

  if (session.role === 'teacher') {
    const teacher = await c.env.GAME_KV.get(`teacher:${session.userId}`, 'json') as Teacher | null;
    if (!teacher) throw new HTTPException(404, { message: 'ユーザーが見つかりません' });
    return c.json({ role: 'teacher', user: { id: teacher.id, email: teacher.email, lectureName: teacher.lectureName, status: teacher.status, reviewNote: teacher.reviewNote } });
  }

  if (session.role === 'admin') {
    return c.json({ role: 'admin', user: { id: 'admin', email: c.env.ADMIN_EMAIL } });
  }

  throw new HTTPException(401, { message: '無効なセッション' });
});

// 教師登録申請
auth.post('/teacher/register', async (c) => {
  const { email, password, passwordConfirm, lectureName, reason } = await c.req.json();

  if (!email || !password || !passwordConfirm || !lectureName || !reason) {
    throw new HTTPException(400, { message: '全ての項目を入力してください' });
  }
  if (password !== passwordConfirm) throw new HTTPException(400, { message: 'パスワードが一致しません' });
  if (password.length < 8) throw new HTTPException(400, { message: 'パスワードは8文字以上で入力してください' });
  if (!email.includes('@')) throw new HTTPException(400, { message: '有効なメールアドレスを入力してください' });

  // 重複チェック
  const existing = await c.env.GAME_KV.get(`teacher:email:${email}`, 'json');
  if (existing) throw new HTTPException(409, { message: 'このメールアドレスは既に登録されています' });

  const passwordHash = await hashPassword(password);
  const teacher: Teacher = {
    id: generateId('tch_'),
    email,
    passwordHash,
    lectureName,
    reason,
    status: 'pending',
    role: 'teacher',
    appliedAt: Date.now(),
    createdAt: Date.now(),
  };

  await kvPut(c.env, `teacher:${teacher.id}`, teacher);
  await c.env.GAME_KV.put(`teacher:email:${email}`, teacher.id);

  return c.json({ success: true, teacherId: teacher.id, message: '登録申請を受け付けました。管理者の審査をお待ちください。' });
});

export default auth;