/** ゲーム生成・管理 API */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../../lib/crypto';
import { getSessionIdFromCookie } from '../../lib/session';
import { getGenCount, incrementGenCount } from '../../lib/kv';
import { getAIProviders, generateWithFallback } from '../../lib/ai';
import { sendTeacherApproved } from '../../lib/email';
import type { Env, Game, Participant, Lecture } from '../../shared';

const game = new Hono<{
  Bindings: Env;
  Variables: {
    participant: Participant;
    lecture: Lecture;
  };
}>();

// 参加者認証ミドルウェア
async function requireParticipant(c: any, next: any) {
  const sessionId = getSessionIdFromCookie(c.req.header('Cookie'));
  if (!sessionId) throw new HTTPException(401, { message: '未ログイン' });

  const session = await c.env.GAME_KV.get(`session:${sessionId}`, 'json') as { userId: string; role: string; lectureId?: string } | null;
  if (!session || session.role !== 'participant') throw new HTTPException(403, { message: '参加者権限が必要です' });

  const participant = await c.env.GAME_KV.get(`participant:${session.userId}`, 'json') as Participant | null;
  if (!participant || participant.status !== 'approved') throw new HTTPException(403, { message: '承認済み参加者のみ' });

  const lecture = await c.env.GAME_KV.get(`lecture:${participant.lectureId}`, 'json') as Lecture | null;
  if (!lecture || lecture.expiresAt < Date.now()) throw new HTTPException(403, { message: '講座期間外です' });

  c.set('participant', participant);
  c.set('lecture', lecture);
  await next();
}

// ゲーム生成
game.post('/generate', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const lecture = c.get('lecture');
  const { prompt } = await c.req.json();

  if (!prompt || !prompt.trim()) throw new HTTPException(400, { message: 'ゲームの説明を入力してください' });

  // 生成回数チェック
  const today = new Date().toISOString().slice(0, 10);
  const userLimit = participant.genLimit ?? lecture.defaultGenLimit;
  await incrementGenCount(c.env, participant.id, today, userLimit);

  // AI生成
  const providers = getAIProviders(c.env);
  const { html, provider } = await generateWithFallback(providers, (p) => p.generate(prompt));

  // タイトル自動生成（簡易版：最初の数単語から）
  const title = generateTitleFromPrompt(prompt);

  const game: Game = {
    id: generateId('g_'),
    participantId: participant.id,
    lectureId: lecture.id,
    title,
    htmlContent: html,
    promptHistory: [prompt],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await c.env.GAME_KV.put(`game:${game.id}`, JSON.stringify(game));
  // リスト更新
  const listKey = `games:list:${participant.id}`;
  let list = (await c.env.GAME_KV.get(listKey, 'json')) as string[] || [];
  list = [game.id, ...list.filter((id) => id !== game.id)].slice(0, 100);
  await c.env.GAME_KV.put(listKey, JSON.stringify(list));

  const remaining = userLimit - (await getGenCount(c.env, participant.id, today));

  return c.json({ success: true, game, remaining, provider });
});

// ゲーム修正
game.post('/modify', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const lecture = c.get('lecture');
  const { gameId, instruction } = await c.req.json();

  if (!gameId || !instruction?.trim()) throw new HTTPException(400, { message: 'ゲームIDと修正指示を入力してください' });

  // 生成回数チェック
  const today = new Date().toISOString().slice(0, 10);
  const userLimit = participant.genLimit ?? lecture.defaultGenLimit;
  await incrementGenCount(c.env, participant.id, today, userLimit);

  const existing = await c.env.GAME_KV.get(`game:${gameId}`, 'json') as Game | null;
  if (!existing) throw new HTTPException(404, { message: 'ゲームが見つかりません' });
  if (existing.participantId !== participant.id) throw new HTTPException(403, { message: '権限がありません' });

  // AI修正
  const providers = getAIProviders(c.env);
  const { html, provider } = await generateWithFallback(providers, (p) => p.modify(existing.htmlContent, instruction));

  const updated: Game = {
    ...existing,
    htmlContent: html,
    promptHistory: [...existing.promptHistory, `修正: ${instruction}`],
    updatedAt: Date.now(),
  };

  await c.env.GAME_KV.put(`game:${gameId}`, JSON.stringify(updated));

  const remaining = userLimit - (await getGenCount(c.env, participant.id, today));

  return c.json({ success: true, game: updated, remaining, provider });
});

// ゲーム取得
game.get('/:id', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const gameId = c.req.param('id');
  const g = await c.env.GAME_KV.get(`game:${gameId}`, 'json') as Game | null;
  if (!g) throw new HTTPException(404, { message: 'ゲームが見つかりません' });
  if (g.participantId !== participant.id) throw new HTTPException(403, { message: '権限がありません' });
  return c.json({ game: g });
});

// ゲーム一覧（直近100件）
game.get('/list/mine', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const listKey = `games:list:${participant.id}`;
  const list = (await c.env.GAME_KV.get(listKey, 'json')) as string[] || [];
  const games = await Promise.all(list.map((id) => c.env.GAME_KV.get(`game:${id}`, 'json')));
  return c.json({ games: games.filter((g): g is Game => g !== null) });
});

// ゲーム保存（既存ゲームの更新）
game.post('/save', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const { gameId } = await c.req.json();

  if (!gameId) throw new HTTPException(400, { message: 'ゲームIDが必要です' });

  const existing = await c.env.GAME_KV.get(`game:${gameId}`, 'json') as Game | null;
  if (!existing) throw new HTTPException(404, { message: 'ゲームが見つかりません' });
  if (existing.participantId !== participant.id) throw new HTTPException(403, { message: '権限がありません' });

  existing.updatedAt = Date.now();
  await c.env.GAME_KV.put(`game:${gameId}`, JSON.stringify(existing));

  return c.json({ success: true, game: existing });
});

// 残り生成回数取得
game.get('/remaining', requireParticipant, async (c) => {
  const participant = c.get('participant');
  const lecture = c.get('lecture');
  const today = new Date().toISOString().slice(0, 10);
  const userLimit = participant.genLimit ?? lecture.defaultGenLimit;
  const used = await getGenCount(c.env, participant.id, today);
  return c.json({ remaining: Math.max(0, userLimit - used), limit: userLimit, used });
});

function generateTitleFromPrompt(prompt: string): string {
  const words = prompt.trim().split(/[\s、。，]+/).filter(Boolean);
  if (words.length <= 8) return words.join(' ') || '無題のゲーム';
  return words.slice(0, 8).join(' ') + '…';
}

export default game;