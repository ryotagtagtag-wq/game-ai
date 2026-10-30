/** システム管理者 API */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getSessionIdFromCookie } from '../../lib/session';
import { kvGet, kvPut } from '../../lib/kv';
import { sendTeacherApproved, sendTeacherRejected } from '../../lib/email';
import type { Env, Teacher, Lecture } from '../../shared';

const admin = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア
async function requireAdmin(c: any, next: any) {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));
  if (!sessionId) throw new HTTPException(401, { message: '未ログイン' });

  const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json') as { role: string } | null;
  if (!session || session.role !== 'admin') throw new HTTPException(403, { message: '管理者権限が必要です' });

  await next();
}

// 教師申請一覧
admin.get('/teachers', requireAdmin, async (c) => {
  const status = c.req.query('status') || 'pending';
  // 全教師を取得（KVから全件スキャン）
  const allKeys = await c.env.GAME_KV.list({ prefix: 'teacher:' });
  const teachers: Teacher[] = [];
  for (const key of allKeys.keys) {
    const t = await c.env.GAME_KV.get(key.name, 'json') as Teacher | null;
    if (t && (status === 'all' || t.status === status)) {
      teachers.push(t);
    }
  }
  // 申請日時順でソート
  teachers.sort((a, b) => b.appliedAt - a.appliedAt);
  return c.json({ teachers });
});

// 教師承認
admin.post('/teachers/:id/approve', requireAdmin, async (c) => {
  const teacherId = c.req.param('id');
  const teacher = await kvGet<Teacher>(c.env, `teacher:${teacherId}`);
  if (!teacher) throw new HTTPException(404, { message: '申請が見つかりません' });
  if (teacher.status !== 'pending') throw new HTTPException(400, { message: '審査待ちの申請ではありません' });

  teacher.status = 'approved';
  teacher.reviewedAt = Date.now();
  teacher.reviewedBy = 'admin';
  await kvPut(c.env, `teacher:${teacherId}`, teacher);

  // 講座自動作成（承認時に講座も作成）
  const code = `LEC-${teacherId.slice(-8).toUpperCase()}`;
  const lecture: Lecture = {
    id: generateId('lec_'),
    code,
    name: teacher.lectureName,
    teacherId,
    expiresAt: Date.now() + 86400 * 1000 * 365, // 1年
    defaultGenLimit: 20,
    createdAt: Date.now(),
  };
  await kvPut(c.env, `lecture:${lecture.id}`, lecture);
  await c.env.GAME_KV.put(`lecture:code:${code}`, lecture.id);
  await c.env.GAME_KV.put(`lecture:teacher:${teacherId}`, lecture.id);

  // 承認メール送信
  try {
    await sendTeacherApproved(c.env, teacher.email, teacher.lectureName);
  } catch (e) {
    console.warn('承認メール送信失敗:', e);
  }

  return c.json({ success: true, teacher, lecture });
});

// 教師却下
admin.post('/teachers/:id/reject', requireAdmin, async (c) => {
  const teacherId = c.req.param('id');
  const { reason } = await c.req.json();
  const teacher = await kvGet<Teacher>(c.env, `teacher:${teacherId}`);
  if (!teacher) throw new HTTPException(404, { message: '申請が見つかりません' });
  if (teacher.status !== 'pending') throw new HTTPException(400, { message: '審査待ちの申請ではありません' });

  teacher.status = 'rejected';
  teacher.reviewedAt = Date.now();
  teacher.reviewedBy = 'admin';
  teacher.reviewNote = reason;
  await kvPut(c.env, `teacher:${teacherId}`, teacher);

  try {
    await sendTeacherRejected(c.env, teacher.email, teacher.lectureName, reason);
  } catch (e) {
    console.warn('却下メール送信失敗:', e);
  }

  return c.json({ success: true, teacher });
});

// 講座一覧
admin.get('/lectures', requireAdmin, async (c) => {
  const allKeys = await c.env.GAME_KV.list({ prefix: 'lecture:id:' });
  const lectures: Lecture[] = [];
  for (const key of allKeys.keys) {
    const l = await c.env.GAME_KV.get(key.name, 'json') as Lecture | null;
    if (l) lectures.push(l);
  }
  lectures.sort((a, b) => b.createdAt - a.createdAt);
  return c.json({ lectures });
});

function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}${timestamp}${random}`;
}

export default admin;