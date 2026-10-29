/** 参加者入室 API */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../lib/crypto';
import { createSession, createSessionCookie } from '../lib/session';
import { kvGet, kvPut } from '../lib/kv';
import type { Env, Participant, Lecture } from '../shared';

const join = new Hono<{ Bindings: Env }>();

// 講座コードで入室
join.post('/join', async (c) => {
  const { code } = await c.req.json();
  if (!code) throw new HTTPException(400, { message: '講座コードを入力してください' });

  const lectureId = await c.env.GAME_KV.get(`lecture:code:${code.toUpperCase()}`);
  if (!lectureId) throw new HTTPException(404, { message: '講座コードが見つかりません' });

  const lecture = await kvGet<Lecture>(c.env, `lecture:${lectureId}`);
  if (!lecture) throw new HTTPException(404, { message: '講座が見つかりません' });
  if (lecture.expiresAt < Date.now()) throw new HTTPException(403, { message: '講座の有効期限が切れています' });

  // 既存参加者チェック（簡易版：セッションから）
  const sessionId = c.req.header('Cookie')?.match(/ai_game_session=([^;]+)/)?.[1];
  let participant: Participant | null = null;

  if (sessionId) {
    const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json') as { userId: string; role: string } | null;
    if (session && session.role === 'participant') {
      participant = await kvGet<Participant>(c.env, `participant:${session.userId}`);
    }
  }

  if (!participant) {
    // 新規参加者作成
    participant = {
      id: generateId('ptc_'),
      lectureId: lecture.id,
      status: 'pending',
      joinedAt: Date.now(),
    };
    await kvPut(c.env, `participant:${participant.id}`, participant);
  } else if (participant.lectureId !== lecture.id) {
    // 別講座の参加者なら新規作成
    participant = {
      id: generateId('ptc_'),
      lectureId: lecture.id,
      status: 'pending',
      joinedAt: Date.now(),
    };
    await kvPut(c.env, `participant:${participant.id}`, participant);
  }

  // セッション作成/更新
  const newSessionId = await createSession(c.env, participant.id, 'participant', lecture.id);
  const cookie = createSessionCookie(newSessionId, c.env.ENVIRONMENT === 'production');

  return c.json(
    { success: true, status: participant.status, lectureName: lecture.name },
    200,
    { 'Set-Cookie': cookie }
  );
});

// 承認待ち画面用ステータス確認
join.get('/status', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/ai_game_session=([^;]+)/)?.[1];
  if (!sessionId) throw new HTTPException(401, { message: 'セッションがありません' });

  const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json') as { userId: string; role: string } | null;
  if (!session || session.role !== 'participant') throw new HTTPException(403, { message: '参加者セッションではありません' });

  const participant = await kvGet<Participant>(c.env, `participant:${session.userId}`);
  if (!participant) throw new HTTPException(404, { message: '参加者情報が見つかりません' });

  const lecture = await kvGet<Lecture>(c.env, `lecture:${participant.lectureId}`);
  return c.json({ status: participant.status, lectureName: lecture?.name, approvedAt: participant.approvedAt });
});

export default join;