/** 教師ログインページ */

import { useSignal } from '@preact/signals';
import { Link } from 'preact-router/match';
import { api } from '../utils/api';

const TeacherLogin = () => {
  const form = useSignal({
    email: '',
    password: '',
  });
  const error = useSignal('');
  const submitting = useSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!form.value.email || !form.value.password) {
      error.value = 'メールアドレスとパスワードを入力してください';
      return;
    }

    submitting.value = true;
    error.value = '';

    try {
      const res = await api.post('/auth/teacher/login', form.value);
      if (res.user?.status === 'pending') {
        window.location.href = '/teacher/pending';
      } else if (res.user?.status === 'rejected') {
        window.location.href = '/teacher/rejected';
      } else {
        window.location.href = '/teacher/dashboard';
      }
    } catch (err: any) {
      error.value = err.message || 'ログインに失敗しました';
    } finally {
      submitting.value = false;
    }
  };

  return (
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>講座主催者ログイン</h1>
          <p>承認済みのアカウントでログインしてください</p>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label" for="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              class="form-input"
              placeholder="teacher@school.ed.jp"
              value={form.value.email}
              onInput={(e) => form.value.email = e.currentTarget.value}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">パスワード</label>
            <input
              type="password"
              id="password"
              class="form-input"
              placeholder="パスワード"
              value={form.value.password}
              onInput={(e) => form.value.password = e.currentTarget.value}
              required
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" disabled={submitting.value}>
            {submitting.value ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p class="auth-footer">
          アカウントをお持ちでない方は <Link href="/teacher/register">登録申請はこちら</Link>
        </p>
      </div>
    </div>
  );
};

export default TeacherLogin;