/** 講座コード入力ページ */

import { useSignal } from '@preact/signals';
import { Link } from 'preact-router/match';
import { api } from '../utils/api';

const Join = ({ user }: { user: any }) => {
  const code = useSignal('');
  const error = useSignal('');
  const submitting = useSignal(false);

  if (user?.role === 'participant' && user?.status === 'approved') {
    return <div class="loading"><div class="spinner"></div><p>リダイレクト中...</p></div>;
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!code.value.trim()) {
      error.value = '講座コードを入力してください';
      return;
    }

    submitting.value = true;
    error.value = '';

    try {
      const res = await api.post('/join/join', { code: code.value.toUpperCase() });
      if (res.status === 'pending') {
        window.location.href = '/waiting';
      } else if (res.status === 'approved') {
        window.location.href = '/app';
      }
    } catch (err: any) {
      error.value = err.message || '入室に失敗しました';
    } finally {
      submitting.value = false;
    }
  };

  return (
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>講座に参加する</h1>
          <p>講座主催者から受け取った講座コードを入力してください</p>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label" for="code">講座コード</label>
            <input
              type="text"
              id="code"
              class="form-input"
              placeholder="AB12-CD34-EF56"
              value={code.value}
              onInput={(e) => code.value = e.currentTarget.value.toUpperCase()}
              required
              style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" disabled={submitting.value}>
            {submitting.value ? '入室中...' : '入室する'}
          </button>
        </form>

        <p class="auth-footer">
          講座主催者の方は <Link href="/teacher/login">こちらからログイン</Link>
        </p>
      </div>
    </div>
  );
};

export default Join;