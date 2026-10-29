/** ゲーム作成画面（メイン） */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const GameMaker = ({ user }: { user: any }) => {
  const prompt = useSignal('');
  const instruction = useSignal('');
  const html = useSignal<string>('');
  const generating = useSignal(false);
  const modifying = useSignal(false);
  const gameId = useSignal<string | null>(null);
  const remaining = useSignal(0);
  const limit = useSignal(0);
  const used = useSignal(0);
  const error = useSignal('');
  const success = useSignal('');

  // 残り回数取得
  useEffect(() => {
    const fetchRemaining = async () => {
      try {
        const res = await api.get('/game/remaining');
        remaining.value = res.remaining;
        limit.value = res.limit;
        used.value = res.used;
      } catch {}
    };
    fetchRemaining();
  }, []);

  const handleGenerate = async (e: Event) => {
    e.preventDefault();
    if (!prompt.value.trim()) return;
    if (remaining.value <= 0) {
      error.value = '生成回数の上限に達しました';
      return;
    }

    generating.value = true;
    error.value = '';
    success.value = '';

    try {
      const res = await api.post('/game/generate', { prompt: prompt.value });
      html.value = res.game.htmlContent;
      gameId.value = res.game.id;
      remaining.value = res.remaining;
      success.value = 'ゲームを生成しました！';
    } catch (err: any) {
      error.value = err.message || '生成に失敗しました';
    } finally {
      generating.value = false;
    }
  };

  const handleModify = async (e: Event) => {
    e.preventDefault();
    if (!instruction.value.trim() || !gameId.value) return;
    if (remaining.value <= 0) {
      error.value = '生成回数の上限に達しました';
      return;
    }

    modifying.value = true;
    error.value = '';
    success.value = '';

    try {
      const res = await api.post('/game/modify', { gameId: gameId.value, instruction: instruction.value });
      html.value = res.game.htmlContent;
      gameId.value = res.game.id;
      remaining.value = res.remaining;
      instruction.value = '';
      success.value = '修正しました！';
    } catch (err: any) {
      error.value = err.message || '修正に失敗しました';
    } finally {
      modifying.value = false;
    }
  };

  const handleSave = async () => {
    if (!gameId.value) return;
    try {
      await api.post('/game/save', { gameId: gameId.value });
      success.value = '保存しました';
    } catch (err: any) {
      error.value = err.message || '保存に失敗しました';
    }
  };

  const handlePreviewLoad = () => {
    // iframe読み込み完了
  };

  return (
    <div class="maker-page">
      <div class="page-header">
        <h1 class="page-title">ゲーム作成</h1>
        <p class="page-subtitle">自然言語でゲームを作成・修正しよう</p>
      </div>

      <div class="remaining-badge" className={remaining.value === 0 ? 'danger' : remaining.value <= 3 ? 'warning' : ''}>
        🎮 残り生成回数: <strong>{remaining.value} / {limit.value}</strong>
      </div>

      {error.value && <div class="alert alert-error">{error.value}</div>}
      {success.value && <div class="alert alert-success">{success.value}</div>}

      <div class="maker-layout">
        {/* 左パネル: 指示入力 */}
        <div class="panel">
          <div class="panel-header">
            <span>📝 指示入力</span>
            <span class="remaining-badge" style={{fontSize: '0.75rem'}}>{used.value}回使用済み</span>
          </div>
          <div class="panel-body">
            {/* 新規生成 */}
            <section style={{marginBottom: '24px'}}>
              <h3 style={{marginBottom: '12px', fontSize: '1rem'}}>新しいゲームを作る</h3>
              <form onSubmit={handleGenerate}>
                <textarea
                  class="form-input form-textarea"
                  placeholder="どんなゲームを作りたいですか？&#10;例: 『スペースキーでジャンプして障害物を避けるゲーム』&#10;例: 『マウスで操作するシューティングゲーム』"
                  value={prompt.value}
                  onInput={(e) => prompt.value = e.currentTarget.value}
                  rows={4}
                  required
                />
                <button type="submit" class="btn btn-primary btn-block mt-12" disabled={generating.value || remaining.value <= 0}>
                  {generating.value ? '🤖 生成中...' : '🎮 ゲームを生成する'}
                </button>
              </form>
            </section>

            <hr style={{margin: '24px 0'}} />

            {/* 修正指示 */}
            <section>
              <h3 style={{marginBottom: '12px', fontSize: '1rem'}}>修正指示</h3>
              <form onSubmit={handleModify}>
                <textarea
                  class="form-input form-textarea"
                  placeholder="どう修正しますか？&#10;例: 『ジャンプの高さを2倍にして』&#10;例: 『敵のスピードを速くして、スコア表示を追加して』"
                  value={instruction.value}
                  onInput={(e) => instruction.value = e.currentTarget.value}
                  rows={3}
                  required
                />
                <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                  <button type="submit" class="btn btn-secondary flex-1" disabled={modifying.value || !gameId.value || remaining.value <= 0}>
                    {modifying.value ? '🔄 修正中...' : '✏️ 修正する'}
                  </button>
                  <button type="button" class="btn btn-primary" onClick={handleSave} disabled={!gameId.value}>
                    💾 保存
                  </button>
                </div>
              </form>
            </section>

            <div style={{marginTop: '24px', padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>
              <strong>ヒント:</strong>
              <ul style={{marginTop: '8px', paddingLeft: '20px', lineHeight: '1.8'}}>
                <li>ジャンルを伝える（アクション、シューティング、パズル、避けゲー等）</li>
                <li>操作方法を指定する（キーボード、マウス、タッチ）</li>
                <li>難易度やスピード感を伝える</li>
                <li>修正は具体的に「○○を△△にして」と指示</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右パネル: プレビュー */}
        <div class="panel">
          <div class="panel-header">
            <span>👁️ プレビュー・プレイ</span>
          </div>
          <div class="panel-body" style={{padding: 0, flex: 1, display: 'flex', flexDirection: 'column'}}>
            {html.value ? (
              <iframe
                class="preview-frame"
                srcDoc={html.value}
                sandbox="allow-scripts allow-same-origin"
                onLoad={handlePreviewLoad}
                title="ゲームプレビュー"
              />
            ) : (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: '16px'}}>
                <div style={{fontSize: '4rem'}}>🎮</div>
                <p>左側で指示を入力して<br />「ゲームを生成する」を押してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMaker;