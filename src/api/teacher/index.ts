/** 講座主催者 (教師) API */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId, generateLectureCode } from '../../lib/crypto';
import { getSessionIdFromCookie } from '../../lib/session';
import { kvGet, kvPut } from '../../lib/kv';
import { sendTeacherApproved, sendTeacherRejected } from '../../lib/email';
import type { Env, Teacher, Lecture, Participant } from '../../shared';

const teacher = new Hono<{ Bindings: Env }>();

// 認証ミドルウェア
async function requireTeacher(c: any, next: any) {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));
  if (!sessionId) throw new HTTPException(401, { message: '未ログイン' });

  const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json') as { userId: string; role: string } | null;
  if (!session || session.role !== 'teacher') throw new HTTPException(403, { message: '教師権限が必要です' });

  const teacher = await kvGet<Teacher>(c.env, `teacher:${session.userId}`);
  if (!teacher || teacher.status !== 'approved') throw new HTTPException(403, { message: '承認済み教師のみアクセス可能' });

  c.set('teacher', teacher);
  c.set('sessionId', sessionId);
  await next();
}

// 自分の講座取得
teacher.get('/lecture', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture) return c.json({ lecture: null });
  return c.json({ lecture });
});

// 講座作成
teacher.post('/lecture', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const { name, expiresAt, defaultGenLimit } = await c.req.json();

  if (!name) throw new HTTPException(400, { message: '講座名を入力してください' });
  if (!expiresAt) throw new HTTPException(400, { message: '有効期限を設定してください' });

  const existing = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (existing) throw new HTTPException(409, { message: '既に講座を作成済みです。講座コードを再発行してください' });

  const code = generateLectureCode();
  const lecture: Lecture = {
    id: generateId('lec_'),
    code,
    name,
    teacherId: teacher.id,
    expiresAt: new Date(expiresAt).getTime(),
    defaultGenLimit: defaultGenLimit ?? 20,
    createdAt: Date.now(),
  };

  await kvPut(c.env, `lecture:${lecture.id}`, lecture);
  await c.env.GAME_KV.put(`lecture:code:${code}`, lecture.id);
  await c.env.GAME_KV.put(`lecture:teacher:${teacher.id}`, lecture.id);

  return c.json({ success: true, lecture });
});

// 講座コード再発行
teacher.post('/lecture/regenerate-code', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture) throw new HTTPException(404, { message: '講座が見つかりません' });

  const oldCode = lecture.code;
  const newCode = generateLectureCode();
  lecture.code = newCode;

  await kvPut(c.env, `lecture:${lecture.id}`, lecture);
  await c.env.GAME_KV.delete(`lecture:code:${oldCode}`);
  await c.env.GAME_KV.put(`lecture:code:${newCode}`, lecture.id);

  return c.json({ success: true, code: newCode });
});

// 講座設定更新
teacher.put('/lecture', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture) throw new HTTPException(404, { message: '講座が見つかりません' });

  const { name, expiresAt, defaultGenLimit } = await c.req.json();
  if (name) lecture.name = name;
  if (expiresAt) lecture.expiresAt = new Date(expiresAt).getTime();
  if (typeof defaultGenLimit === 'number') lecture.defaultGenLimit = defaultGenLimit;

  await kvPut(c.env, `lecture:${lecture.id}`, lecture);
  return c.json({ success: true, lecture });
});

// 参加者一覧取得
teacher.get('/participants', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture) return c.json({ participants: [] });

  // TODO: インデックスから取得する実装が必要。現状は全件スキャンの代替
  return c.json({ participants: [], lecture });
});

// 参加者承認
teacher.post('/participants/:id/approve', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const participantId = c.req.param('id');
  const participant = await kvGet<Participant>(c.env, `participant:${participantId}`);
  if (!participant) throw new HTTPException(404, { message: '参加者が見つかりません' });

  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture || participant.lectureId !== lecture.id) throw new HTTPException(403, { message: '権限がありません' });

  participant.status = 'approved';
  participant.approvedAt = Date.now();
  participant.approvedBy = teacher.id;
  await kvPut(c.env, `participant:${participantId}`, participant);

  // メール通知（教師登録時のメールアドレスを取得して送信）
  const teacherData = await kvGet<Teacher>(c.env, `teacher:${teacher.id}`);
  if (teacherData) {
    try {
      await sendTeacherApproved(c.env, teacherData.email, lecture.name);
    } catch (e) {
      console.warn('承認メール送信失敗:', e);
    }
  }

  return c.json({ success: true, participant });
});

// 参加者却下
teacher.post('/participants/:id/reject', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const participantId = c.req.param('id');
  const { reason } = await c.req.json();
  const participant = await kvGet<Participant>(c.env, `participant:${participantId}`);
  if (!participant) throw new HTTPException(404, { message: '参加者が見つかりません' });

  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture || participant.lectureId !== lecture.id) throw new HTTPException(403, { message: '権限がありません' });

  participant.status = 'rejected';
  await kvPut(c.env, `participant:${participantId}`, participant);

  const teacherData = await kvGet<Teacher>(c.env, `teacher:${teacher.id}`);
  if (teacherData) {
    try {
      await sendTeacherRejected(c.env, teacherData.email, lecture.name, reason);
    } catch (e) {
      console.warn('却下メール送信失敗:', e);
    }
  }

  return c.json({ success: true, participant });
});

// 生成回数上限設定
teacher.put('/participants/:id/gen-limit', requireTeacher, async (c) => {
  const teacher = c.get('teacher');
  const participantId = c.req.param('id');
  const { limit } = await c.req.json();
  const participant = await kvGet<Participant>(c.env, `participant:${participantId}`);
  if (!participant) throw new HTTPException(404, { message: '参加者が見つかりません' });

  const lecture = await kvGet<Lecture>(c.env, `lecture:teacher:${teacher.id}`);
  if (!lecture || participant.lectureId !== lecture.id) throw new HTTPException(403, { message: '権限がありません' });

  participant.genLimit = limit ?? null;
  await kvPut(c.env, `participant:${participantId}`, participant);
  return c.json({ success: true, participant });
});

export default teacher;