/** メール送信 (既存 ryopc.org API 使用) */

import type { Env } from '../shared';

const EMAIL_API_ENDPOINT = 'https://ryopc.org/api/mail/index.php';
const DEFAULT_FROM = 'ai-game@ryopc.org';
const DEFAULT_FROM_NAME = 'AIゲームメーカー';

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
}

async function sendEmailAPI(env: Env, req: EmailRequest): Promise<void> {
  const res = await fetch(EMAIL_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RYOPC_EMAIL_API_KEY}`,
    },
    body: JSON.stringify({
      ...req,
      format: 'html',
      from: DEFAULT_FROM,
      from_name: DEFAULT_FROM_NAME,
    }),
  });

  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(`Email API error: ${data.message}`);
  }
}

export async function sendTeacherApproved(
  env: Env,
  to: string,
  lectureName: string
): Promise<void> {
  const body = `
    <html><body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#f0f9ff;border-radius:8px;padding:24px;border:1px solid #bae6fd;">
        <h2 style="margin:0 0 16px;color:#0369a1;">講座主催者登録が承認されました</h2>
        <p style="margin:0 0 16px;">「${lectureName}」の講座主催者として承認されました。</p>
        <p style="margin:0 0 24px;">ログインして講座を作成し、生徒に講座コードを配布してください。</p>
        <a href="https://ai-game.ryopc.org/teacher/login"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
          ログインして講座を作成する
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#64748b;">AIゲームメーカー <ai-game@ryopc.org></p>
    </body></html>
  `;

  await sendEmailAPI(env, {
    to,
    subject: `【承認完了】${lectureName} - AIゲームメーカー`,
    body,
  });
}

export async function sendTeacherRejected(
  env: Env,
  to: string,
  lectureName: string,
  reason?: string
): Promise<void> {
  const body = `
    <html><body style="font-family:system-ui,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#fef2f2;border-radius:8px;padding:24px;border:1px solid #fecaca;">
        <h2 style="margin:0 0 16px;color:#dc2626;">講座主催者登録が却下されました</h2>
        <p style="margin:0 0 16px;">「${lectureName}」の申請は却下されました。</p>
        ${reason ? `<p style="margin:0 0 16px;"><strong>理由:</strong> ${reason}</p>` : ''}
        <p style="margin:0;">ご不明な点があれば管理者にお問い合わせください。</p>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#64748b;">AIゲームメーカー <ai-game@ryopc.org></p>
    </body></html>
  `;

  await sendEmailAPI(env, {
    to,
    subject: `【審査結果】${lectureName} - AIゲームメーカー`,
    body,
  });
}