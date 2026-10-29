/** KV ヘルパー関数 */

import type { Env } from '../shared';
import { generateId } from './crypto';

export const KV_PREFIX = {
  teacher: 'teacher:',
  lecture: 'lecture:',
  lectureCode: 'lecture:code:',
  participant: 'participant:',
  game: 'game:',
  gameList: 'games:list:',
  genCount: 'gen:count:',
} as const;

function key(prefix: string, ...parts: string[]): string {
  return prefix + parts.join(':');
}

export async function kvGet<T>(env: Env, k: string): Promise<T | null> {
  const data = await env.GAME_KV.get(k, 'json');
  return data as T | null;
}

export async function kvPut(env: Env, k: string, value: unknown, ttl?: number): Promise<void> {
  await env.GAME_KV.put(k, JSON.stringify(value), { expirationTtl: ttl });
}

export async function kvDelete(env: Env, k: string): Promise<void> {
  await env.GAME_KV.delete(k);
}

// Teacher
export async function getTeacherById(env: Env, id: string) {
  return kvGet<Teacher>(env, key(KV_PREFIX.teacher, id));
}

export async function getTeacherByEmail(env: Env, email: string) {
  // emailで検索するためにはインデックスが必要だが、ここでは全件スキャンの代替として
  // 実運用では D1 または別途 email→id インデックスを作成
  return null; // TODO: D1移行時に実装
}

export async function putTeacher(env: Env, teacher: Teacher) {
  await kvPut(env, key(KV_PREFIX.teacher, teacher.id), teacher);
}

// Lecture
export async function getLectureById(env: Env, id: string) {
  return kvGet<Lecture>(env, key(KV_PREFIX.lecture, 'id', id));
}

export async function getLectureByCode(env: Env, code: string) {
  const id = await env.GAME_KV.get(key(KV_PREFIX.lectureCode, code));
  if (!id) return null;
  return getLectureById(env, id);
}

export async function putLecture(env: Env, lecture: Lecture) {
  await kvPut(env, key(KV_PREFIX.lecture, 'id', lecture.id), lecture);
  await env.GAME_KV.put(key(KV_PREFIX.lectureCode, lecture.code), lecture.id);
}

export async function getLecturesByTeacher(env: Env, teacherId: string): Promise<Lecture[]> {
  // TODO: インデックス作成時まで空配列返す
  return [];
}

// Participant
export async function getParticipantById(env: Env, id: string) {
  return kvGet<Participant>(env, key(KV_PREFIX.participant, id));
}

export async function putParticipant(env: Env, participant: Participant) {
  await kvPut(env, key(KV_PREFIX.participant, participant.id), participant);
}

export async function getParticipantsByLecture(env: Env, lectureId: string): Promise<Participant[]> {
  // TODO: インデックス作成
  return [];
}

// Game
export async function getGameById(env: Env, id: string) {
  return kvGet<Game>(env, key(KV_PREFIX.game, id));
}

export async function putGame(env: Env, game: Game) {
  await kvPut(env, key(KV_PREFIX.game, game.id), game);
  // リスト更新
  const listKey = key(KV_PREFIX.gameList, game.participantId);
  let list = (await env.GAME_KV.get(listKey, 'json')) as string[] || [];
  list = [game.id, ...list.filter((id) => id !== game.id)].slice(0, 100);
  await env.GAME_KV.put(listKey, JSON.stringify(list));
}

export async function getGamesByParticipant(env: Env, participantId: string): Promise<Game[]> {
  const list = (await env.GAME_KV.get(key(KV_PREFIX.gameList, participantId), 'json')) as string[] || [];
  const games = await Promise.all(list.map((id) => getGameById(env, id)));
  return games.filter((g): g is Game => g !== null);
}

// Generation Count
export async function getGenCount(env: Env, participantId: string, date: string): Promise<number> {
  const data = await env.GAME_KV.get(key(KV_PREFIX.genCount, participantId, date), 'json');
  return (data as { count: number } | null)?.count || 0;
}

export async function incrementGenCount(env: Env, participantId: string, date: string, limit: number): Promise<number> {
  const countKey = key(KV_PREFIX.genCount, participantId, date);
  const current = await getGenCount(env, participantId, date);
  if (current >= limit) throw new Error('GENERATION_LIMIT_EXCEEDED');
  const newCount = current + 1;
  await env.GAME_KV.put(countKey, JSON.stringify({ count: newCount }), { expirationTtl: 86400 * 2 });
  return newCount;
}

// 型インポート
import type { Teacher, Lecture, Participant, Game } from '../shared/types';