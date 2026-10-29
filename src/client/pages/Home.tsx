/** トップページ */

import { Link } from 'preact-router/match';

const Home = () => {
  return (
    <div class="home">
      <div class="hero">
        <h1>AIゲームメーカー</h1>
        <p class="subtitle">自然言語だけで、誰でもHTMLゲームが作れる</p>
        <div class="cta-group">
          <Link href="/teacher/register" class="btn btn-primary btn-lg">
            講座主催者として始める
          </Link>
          <Link href="/teacher/login" class="btn btn-secondary btn-lg">
            講座主催者ログイン
          </Link>
        </div>
        <p class="or-divider">または</p>
        <Link href="/join" class="btn btn-secondary btn-lg">
          講座コードで参加する
        </Link>
      </div>

      <div class="features">
        <div class="feature">
          <h3>💬 言葉で作る</h3>
          <p>「避けゲー作って」「ジャンプを高くして」と話すだけでAIがHTMLゲームを生成</p>
        </div>
        <div class="feature">
          <h3>▶️ すぐ遊べる</h3>
          <p>生成されたゲームはその場でプレビュー。修正指示も自然言語でOK</p>
        </div>
        <div class="feature">
          <h3>🏫 講座で使える</h3>
          <p>教師が講座を作成、生徒はコードで参加。承認制で安心・安全</p>
        </div>
      </div>
    </div>
  );
};

export default Home;