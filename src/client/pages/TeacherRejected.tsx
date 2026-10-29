/** 却下ページ */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const TeacherRejected = () => {
  const reason = useSignal('');

  useEffect(() => {
    const fetchReason = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.user?.reviewNote) {
          reason.value = res.user.reviewNote;
        }
      } catch {}
    };
    fetchReason();
  }, []);

  return (
    <div class="status-page">
      <div class="status-card rejected">
        <div class="status-icon rejected">❌</div>
        <h1>申請が却下されました</h1>
        <p>申し訳ありませんが、登録申請は却下されました。</p>
        {reason.value && (
          <div class="reason-box">
            <strong>却下理由:</strong>
            <p>{reason.value}</p>
          </div>
        )}
        <p class="status-note">ご不明な点があれば管理者にお問い合わせください。</p>
      </div>
    </div>
  );
};

export default TeacherRejected;