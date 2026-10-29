/** 承認待ちページ */

const TeacherPending = () => {
  return (
    <div class="status-page">
      <div class="status-card">
        <div class="status-icon pending">⏳</div>
        <h1>審査中です</h1>
        <p>登録申請を受け付けました。管理者の審査が完了するまでお待ちください。</p>
        <p class="status-note">承認されるとログインできるようになります。メールでも通知されます。</p>
      </div>
    </div>
  );
};

export default TeacherPending;