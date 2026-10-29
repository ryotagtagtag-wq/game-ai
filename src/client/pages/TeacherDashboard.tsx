/** 講座主催者ダッシュボード */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const TeacherDashboard = ({ user }: { user: any }) => {
  const activeTab = useSignal<'overview' | 'participants' | 'settings'>('overview');
  const lecture = useSignal<any>(null);
  const participants = useSignal<any[]>([]);
  const loading = useSignal(true);
  const error = useSignal('');
  const success = useSignal('');

  useEffect(() => {
    const fetchLecture = async () => {
      try {
        const res = await api.get('/teacher/lecture');
        lecture.value = res.lecture;
      } catch (err: any) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };
    fetchLecture();
  }, []);

  const handleCodeRegenerate = async () => {
    try {
      const res = await api.post('/teacher/lecture/regenerate-code', {});
      if (res.lecture) {
        lecture.value = res.lecture;
        success.value = '講座コードを再発行しました';
      }
    } catch (err: any) {
      error.value = err.message;
    }
  };

  const handleLectureUpdate = async (e: Event) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const res = await api.put('/teacher/lecture', {
        name: formData.get('name'),
        expiresAt: formData.get('expiresAt'),
        defaultGenLimit: Number(formData.get('defaultGenLimit')),
      });
      if (res.lecture) {
        lecture.value = res.lecture;
        success.value = '設定を更新しました';
      }
    } catch (err: any) {
      error.value = err.message;
    }
  };

  if (loading.value) return <div class="loading"><div class="spinner"></div></div>;

  return (
    <div class="dashboard-page">
      <div class="page-header">
        <h1 class="page-title">講座ダッシュボード</h1>
        <p class="page-subtitle">{lecture.value?.name || '講座名未設定'}</p>
      </div>

      {error.value && <div class="alert alert-error">{error.value}</div>}
      {success.value && <div class="alert alert-success">{success.value}</div>}

      <div class="tabs" role="tablist">
        <button role="tab" class={activeTab.value === 'overview' ? 'active' : ''} onClick={() => activeTab.value = 'overview'}>概要</button>
        <button role="tab" class={activeTab.value === 'participants' ? 'active' : ''} onClick={() => activeTab.value = 'participants'}>参加者管理</button>
        <button role="tab" class={activeTab.value === 'settings' ? 'active' : ''} onClick={() => activeTab.value = 'settings'}>講座設定</button>
      </div>

      <div class="tab-panel">
        {activeTab.value === 'overview' && <OverviewTab lecture={lecture.value} />}
        {activeTab.value === 'participants' && <ParticipantsTab lecture={lecture.value} />}
        {activeTab.value === 'settings' && <SettingsTab lecture={lecture.value} onRegenerate={handleCodeRegenerate} onUpdate={handleLectureUpdate} />}
      </div>
    </div>
  );
};

const OverviewTab = ({ lecture }: { lecture: any }) => {
  if (!lecture) return <p>講座が作成されていません</p>;

  const expired = lecture.expiresAt < Date.now();
  const daysLeft = Math.max(0, Math.ceil((lecture.expiresAt - Date.now()) / 86400000));

  return (
    <div class="overview-tab">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{lecture.code}</div>
          <div class="stat-label">講座コード <button class="btn-copy" onClick={() => navigator.clipboard.writeText(lecture.code)}>コピー</button></div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{expired ? '期限切れ' : `${daysLeft}日`}</div>
          <div class="stat-label">有効期限 {expired ? '<span class="badge badge-rejected">期限切れ</span>' : ''}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{lecture.defaultGenLimit}</div>
          <div class="stat-label">デフォルト生成上限/日</div>
        </div>
      </div>

      <div class="card mt-24">
        <div class="card-header">
          <h3>講座情報</h3>
        </div>
        <div class="card-body">
          <dl class="info-list">
            <dt>講座名</dt><dd>{lecture.name}</dd>
            <dt>講座コード</dt><dd>{lecture.code}</dd>
            <dt>有効期限</dt><dd>{new Date(lecture.expiresAt).toLocaleDateString('ja-JP')}</dd>
            <dt>デフォルト生成上限</dt><dd>{lecture.defaultGenLimit}回/日</dd>
            <dt>作成日</dt><dd>{new Date(lecture.createdAt).toLocaleString('ja-JP')}</dd>
          </dl>
        </div>
      </div>

      <div class="card mt-16">
        <div class="card-header">
          <h3>クイックアクション</h3>
        </div>
        <div class="card-body">
          <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            <a href="/app" class="btn btn-primary">ゲーム作成へ</a>
            <a href="/mygames" class="btn btn-secondary">マイゲーム</a>
          </div>
        </div>
      </div>
    </div>
  );
};

const ParticipantsTab = ({ lecture }: { lecture: any }) => {
  const filter = useSignal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const participants = useSignal<any[]>([]);
  const loading = useSignal(false);

  // TODO: 参加者一覧取得API実装後、ここで読み込み

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/teacher/participants/${id}/approve`);
      // 再読み込み
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('却下理由（任意）');
    try {
      await api.post(`/teacher/participants/${id}/reject`, { reason: reason || '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLimitChange = async (id: string, current: number) => {
    const limit = prompt('新しい生成上限（空欄でデフォルト）', String(current || ''));
    if (limit === null) return;
    try {
      await api.put(`/teacher/participants/${id}/gen-limit`, { limit: limit ? Number(limit) : null });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div class="participants-tab">
      <div class="filter-bar">
        <select value={filter.value} onChange={(e) => filter.value = e.target.value as any} class="form-input" style={{width: 'auto', maxWidth: '200px'}}>
          <option value="all">全て</option>
          <option value="pending">承認待ち</option>
          <option value="approved">承認済み</option>
          <option value="rejected">却下</option>
        </select>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>参加日時</th>
              <th>ステータス</th>
              <th>生成回数/上限</th>
              <th>最終利用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {participants.value.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)'}}>
                参加者がいません。講座コードを生徒に配布してください。
              </td></tr>
            ) : (
              participants.value.map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.joinedAt).toLocaleString('ja-JP')}</td>
                  <td><span class="badge badge-{p.status}">{p.status === 'pending' ? '承認待ち' : p.status === 'approved' ? '承認済み' : '却下'}</span></td>
                  <td>{p.genCount || 0} / {p.genLimit || lecture.defaultGenLimit}</td>
                  <td>{p.lastUsed ? new Date(p.lastUsed).toLocaleString('ja-JP') : '—'}</td>
                  <td>
                    {p.status === 'pending' && (
                      <>
                        <button class="btn btn-primary btn-sm" onClick={() => handleApprove(p.id)}>承認</button>
                        <button class="btn btn-danger btn-sm" onClick={() => handleReject(p.id)}>却下</button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <>
                        <button class="btn btn-secondary btn-sm" onClick={() => handleLimitChange(p.id, p.genLimit)}>上限変更</button>
                        <button class="btn btn-danger btn-sm" onClick={() => handleReject(p.id)}>却下</button>
                      </>
                    )}
                    {p.status === 'rejected' && (
                      <button class="btn btn-primary btn-sm" onClick={() => handleApprove(p.id)}>再承認</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsTab = ({ lecture }: { lecture: any }, { onRegenerate, onUpdate }: { onRegenerate: () => void; onUpdate: (e: Event) => void }) => {
  if (!lecture) return <p>講座が作成されていません</p>;

  return (
    <div class="settings-tab">
      <form onSubmit={onUpdate} class="card">
        <div class="card-header"><h3>講座基本設定</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label" for="name">講座名</label>
            <input type="text" id="name" name="name" class="form-input" defaultValue={lecture.name} required />
          </div>
          <div class="form-group">
            <label class="form-label" for="expiresAt">有効期限</label>
            <input type="date" id="expiresAt" name="expiresAt" class="form-input" defaultValue={new Date(lecture.expiresAt).toISOString().slice(0, 10)} required />
          </div>
          <div class="form-group">
            <label class="form-label" for="defaultGenLimit">デフォルト生成上限（日次）</label>
            <input type="number" id="defaultGenLimit" name="defaultGenLimit" class="form-input" defaultValue={lecture.defaultGenLimit} min={1} max={1000} required />
          </div>
          <button type="submit" class="btn btn-primary mt-16">設定を保存</button>
        </div>
      </form>

      <div class="card mt-16">
        <div class="card-header"><h3>講座コード再発行</h3></div>
        <div class="card-body">
          <p class="status-note">古いコードは無効になります。参加済みの生徒には影響ありませんが、新規参加者は新しいコードを使用します。</p>
          <button class="btn btn-danger" onClick={onRegenerate}>講座コードを再発行する</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;