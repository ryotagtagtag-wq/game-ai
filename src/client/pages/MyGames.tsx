/** マイゲーム一覧 */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const MyGames = ({ user }: { user: any }) => {
  const games = useSignal<any[]>([]);
  const loading = useSignal(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await api.get('/game/list/mine');
        games.value = res.games || [];
      } catch {}
      loading.value = false;
    };
    fetchGames();
  }, []);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('ja-JP', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handlePlay = (game: any) => {
    window.open(`/app?game=${game.id}`, '_blank');
  };

  const handleEdit = (game: any) => {
    window.location.href = `/app?game=${game.id}`;
  };

  if (loading.value) {
    return <div class="loading"><div class="spinner"></div></div>;
  }

  return (
    <div class="mygames-page">
      <div class="page-header">
        <h1 class="page-title">マイゲーム</h1>
        <p class="page-subtitle">作成したゲーム一覧（直近100件）</p>
      </div>

      {games.value.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <h2>まだゲームがありません</h2>
          <p>「ゲーム作成」で最初のゲームを作ってみましょう</p>
          <a href="/app" class="btn btn-primary mt-16">ゲームを作成する</a>
        </div>
      ) : (
        <div class="games-grid">
          {games.value.map((game) => (
            <article key={game.id} class="game-card">
              <div class="game-card-header">
                <span class="game-card-title">{game.title}</span>
                <span class="badge badge-approved">保存済み</span>
              </div>
              <div class="game-card-body">
                <div class="game-card-meta">
                  <span>作成: {formatDate(game.createdAt)}</span>
                  <span>更新: {formatDate(game.updatedAt)}</span>
                  <span>{game.promptHistory?.length || 1} 回の指示</span>
                </div>
              </div>
              <div class="game-card-actions">
                <button class="btn btn-secondary flex-1" onClick={() => handlePlay(game)}>
                  ▶️ 遊ぶ
                </button>
                <button class="btn btn-primary flex-1" onClick={() => handleEdit(game)}>
                  ✏️ 修正・続きを作る
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyGames;