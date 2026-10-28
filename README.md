# AIゲームメーカー (AI Game Maker)

自然言語だけでHTMLゲームを作成できる教育向けWebアプリ。小学生〜誰でも遊べるユニバーサルデザインで、講座（授業）での利用を想定しています。

## 特徴

- **完全AI任せ**: 「こんなゲーム作って」と指示するだけでHTMLゲームが生成される
- **即プレビュー・プレイ**: 作ったその場でiframeで遊べる
- **自然言語で修正**: 「スピードを上げて」「敵を増やして」と指示するだけで再生成
- **講座管理機能**: 教師が講座を作成、生徒は講座コードで参加、承認制で安全
- **生成回数制限**: 日次上限を教師が設定可能（無料枠保護）
- **ユニバーサルデザイン**: キーボード/タッチ対応、色覚配慮、シンプルUI

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Runtime | Cloudflare Workers (単一プロジェクト) |
| Frontend | Preact + TypeScript + Vite |
| Backend | Hono (API) |
| AI (メイン) | Groq API - Llama 3.1 8B Instant |
| AI (フォールバック) | Gemini 3.5 Flash-Lite |
| Storage | Cloudflare KV + D1 |
| Auth | HttpOnly Cookie + KVセッション |
| Email | 既存 ryopc.org API |

## セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# デプロイ
npm run deploy
```

## 環境変数

```bash
# 必須
GROQ_API_KEY=           # Groq APIキー
GEMINI_API_KEY=         # Gemini APIキー
RYOPC_EMAIL_API_KEY=    # ryopc.orgメールAPIキー
SESSION_SECRET=         # セッション署名用

# 初期管理者（初回のみ）
ADMIN_EMAIL=            # 初期システム管理者メール
ADMIN_PASSWORD_HASH=    # 初期システム管理者パスワードハッシュ
```

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照してください。