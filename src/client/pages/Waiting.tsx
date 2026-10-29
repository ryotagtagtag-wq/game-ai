/** 参加者承認待ちページ */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const Waiting = () => {
  const status = useSignal<'pending' | 'approved'>('pending');
  const lectureName = useSignal('');
  const checking = useSignal(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const check = async () => {
      try {
        const res = await api.get('/join/status');
        status.value = res.status;
        lectureName.value = res.lectureName || '';
        if (res.status === 'approved') {
          checking.value = false;
          if (intervalId) clearInterval(intervalId);
          window.location.href = '/app';
        }
      } catch {
        checking.value = false;
        if (intervalId) clearInterval(intervalId);
      }
    };

    check();
    if (status.value === 'pending') {
      intervalId = setInterval(check, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (checking.value && status.value === 'pending') {
    return (
      <div class="status-page">
        <div class="status-card">
          <div class="spinner" style={{width: '48px', height: '48px', margin: '0 auto 24px'}}></div>
          <h1>確認中...</h1>
        </div>
      </div>
    );
  }

  return (
    <div class="status-page">
      <div class="status-card">
        <div class="status-icon pending">⏳</div>
        <h1>承認待ちです</h1>
        <p>「{lectureName.value}」への参加申請を受け付けました。</p>
        <p>講座主催者の承認までお待ちください。承認されると自動的にゲーム作成画面に移動します。</p>
        <p class="status-note">自動的に確認しています。このページを開いたままお待ちください。</p>
      </div>
    </div>
  );
};

export default Waiting;