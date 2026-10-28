/// <reference types="@cloudflare/workers-types" />

export interface CloudflareBindings {
  // KV
  GAME_KV: KVNamespace;

  // D1
  DB: D1Database;

  // Assets
  ASSETS: Fetcher;

  // Secrets
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  RYOPC_EMAIL_API_KEY: string;
  SESSION_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
}

export type Env = CloudflareBindings;