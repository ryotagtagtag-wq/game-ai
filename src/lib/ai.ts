/** AI クライアント (Groq メイン + Gemini フォールバック) */

import type { Env } from '../shared';

const SYSTEM_PROMPT = `あなたは小学生向けHTMLゲーム作成アシスタントです。
以下のルールを厳守してください：

1. 単一のHTMLファイルとして出力（<!DOCTYPE html>から</html>まで全て）
2. CSS/JavaScriptは全てHTML内にインライン記述
3. 外部ライブラリ・CDN読み込みは禁止（全てバニラJSで実装）
4. キーボード/タッチ両方で遊べるよう実装
5. 説明文、マークダウン、コメントは一切出力しない。HTMLのみ出力
6. シンプルで動作するゲームを作成
7. 画面サイズ可変に対応（viewport設定）
8. 日本語UI`;

const MODIFY_PROMPT = `以下のHTMLゲームを修正してください。ルールは同じです。
- HTMLのみ出力
- 説明文・マークダウン禁止
- 前回のHTML全体をベースに、指示通り修正`;

export interface AIProvider {
  name: string;
  generate(prompt: string): Promise<string>;
  modify(html: string, instruction: string): Promise<string>;
}

function createGroqProvider(env: Env): AIProvider {
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.1-8b-instant';

  async function call(messages: { role: string; content: string }[]): Promise<string> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error: ${res.status} ${err}`);
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content || '';
  }

  return {
    name: 'groq',
    async generate(prompt: string) {
      return call([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ]);
    },
    async modify(html: string, instruction: string) {
      return call([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `前回のHTML:\n${html}` },
        { role: 'user', content: `修正指示: ${instruction}\n${MODIFY_PROMPT}` },
      ]);
    },
  };
}

function createGeminiProvider(env: Env): AIProvider {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`;

  async function call(prompt: string): Promise<string> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${err}`);
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  return {
    name: 'gemini',
    async generate(prompt: string) {
      return call(`${SYSTEM_PROMPT}\n\nユーザー指示: ${prompt}`);
    },
    async modify(html: string, instruction: string) {
      return call(`${SYSTEM_PROMPT}\n\n前回のHTML:\n${html}\n\n修正指示: ${instruction}\n${MODIFY_PROMPT}`);
    },
  };
}

export function getAIProviders(env: Env): AIProvider[] {
  return [
    createGroqProvider(env),
    createGeminiProvider(env),
  ];
}

export async function generateWithFallback(
  providers: AIProvider[],
  generateFn: (p: AIProvider) => Promise<string>
): Promise<{ html: string; provider: string }> {
  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const html = await generateFn(provider);
      if (html && html.includes('<!DOCTYPE html>')) {
        return { html: html.trim(), provider: provider.name };
      }
      throw new Error('Invalid HTML response');
    } catch (e) {
      lastError = e as Error;
      console.warn(`Provider ${provider.name} failed:`, e);
    }
  }

  throw lastError || new Error('All AI providers failed');
}