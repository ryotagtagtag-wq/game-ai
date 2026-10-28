/** 共通型定義 */

export type UserRole = 'admin' | 'teacher' | 'participant';
export type TeacherStatus = 'pending' | 'approved' | 'rejected';
export type ParticipantStatus = 'pending' | 'approved' | 'rejected';

export interface Teacher {
  id: string;
  email: string;
  passwordHash: string;
  lectureName: string;
  reason: string;
  status: TeacherStatus;
  role: 'teacher';
  appliedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: number;
}

export interface SystemAdmin {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin';
  createdAt: number;
}

export interface Lecture {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  expiresAt: number;
  defaultGenLimit: number;
  createdAt: number;
}

export interface Participant {
  id: string;
  lectureId: string;
  status: ParticipantStatus;
  joinedAt: number;
  approvedAt?: number;
  approvedBy?: string;
  genLimit?: number | null;
}

export interface Game {
  id: string;
  participantId: string;
  lectureId: string;
  title: string;
  htmlContent: string;
  promptHistory: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  sessionId: string;
  userId: string;
  role: UserRole;
  lectureId?: string;
  expiresAt: number;
}

export interface GenerationCount {
  count: number;
  limit: number;
  resetAt: number;
}

export interface AIProvider {
  name: 'groq' | 'gemini' | 'openrouter';
  generate(prompt: string, systemPrompt: string): Promise<string>;
}