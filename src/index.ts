/** メイン Worker エントリーポイント */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import teacherRoutes from './api/teacher';
import adminRoutes from './api/admin';
import gameRoutes from './api/game';
import authRoutes from './api/auth';
import joinRoutes from './api/join';

import type { Env } from './shared/env';

const app = new Hono<{ Bindings: Env }>();

// ミドルウェア
app.use('*', logger());
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    frameSrc: ["'self'"],
    connectSrc: ["'self'"],
  },
  xFrameOptions: 'SAMEORIGIN',
}));
app.use('/api/*', cors({
  origin: ['https://ai-game.ryopc.org', 'http://localhost:8788'],
  credentials: true,
}));

// ヘルスチェック
app.get('/api/health', (c) => c.json({ ok: true, timestamp: Date.now() }));

// API ルート
app.route('/api/teacher', teacherRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/game', gameRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/join', joinRoutes);

// 静的ファイル配信 (Assets Binding)
app.get('*', async (c, next) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  if (asset.status !== 404) return asset;

  // SPA フォールバック: index.html を返す
  const url = new URL('/', c.req.url);
  const indexReq = new Request(url, c.req.raw);
  return c.env.ASSETS.fetch(indexReq);
});

export default app;