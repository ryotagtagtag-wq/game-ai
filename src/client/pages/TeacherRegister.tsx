/** 教師登録申請ページ */

import { useSignal } from '@preact/signals';
import { Link } from 'preact-router/match';
import { api } from '../utils/api';

const TeacherRegister = () => {
  const form = useSignal({
    email: '',
    password: '',
    passwordConfirm: '',
    lectureName: '',
    reason: '',
  });
  const error = useSignal('');
  const submitting = useSignal(false);

  const validate = () => {
    if (!form.value.email || !form.value.password || !form.value.passwordConfirm || !form.value.lectureName || !form.value.reason) {
      error.value = '全ての項目を入力してください';
      return false;
    }
    if (form.value.password !== form.value.passwordConfirm) {
      error.value = 'パスワードが一致しません';
      return false;
    }
    if (form.value.password.length < 8) {
      error.value = 'パスワードは8文字以上で入力してください';
      return false;
    }
    if (!form.value.email.includes('@')) {
      error.value = '有効なメールアドレスを入力してください';
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!validate()) return;

    submitting.value = true;
    error.value = '';

    try {
      await api.post('/auth/teacher/register', form.value);
      window.location.href = '/teacher/pending';
    } catch (err: any) {
      error.value = err.message || '登録に失敗しました';
    } finally {
      submitting.value = false;
    }
  };

  return (
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>講座主催者（先生）登録申請</h1>
          <p>講座名と利用目的を入力して申請してください。管理者の承認後に利用可能になります。</p>
        </div>

        {error.value && <div class="alert alert-error">{error.value}</div>}

        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label class="form-label" for="lectureName">講座名 <span class="required">*</span></label>
            <input
              type="text"
              id="lectureName"
              class="form-input"
              placeholder="例：○○中学校 プログラミング講座"
              value={form.value.lectureName}
              onInput={(e) => form.value.lectureName = e.currentTarget.value}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="reason">登録理由 <span class="required">*</span></label>
            <textarea
              id="reason"
              class="form-input form-textarea"
              placeholder="このアプリを講座でどのように活用したいか、目的などをお聞かせください"
              value={form.value.reason}
              onInput={(e) => form.value.reason = e.currentTarget.value}
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">メールアドレス <span class="required">*</span></label>
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
            <label class="form-label" for="password">パスワード <span class="required">*</span></label>
            <input
              type="password"
              id="password"
              class="form-input"
              placeholder="8文字以上"
              value={form.value.password}
              onInput={(e) => form.value.password = e.currentTarget.value}
              required
              minLength={8}
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="passwordConfirm">パスワード（確認） <span class="required">*</span></label>
            <input
              type="password"
              id="passwordConfirm"
              class="form-input"
              placeholder="確認のためもう一度"
              value={form.value.passwordConfirm}
              onInput={(e) => form.value.passwordConfirm = e.currentTarget.value}
              required
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" disabled={submitting.value}>
            {submitting.value ? '申請中...' : '登録申請する'}
          </button>
        </form>

        <p class="auth-footer">
          すでにアカウントをお持ちの方は <Link href="/teacher/login">ログインはこちら</Link>
        </p>
      </div>
    </div>
  );
};

export default TeacherRegister;