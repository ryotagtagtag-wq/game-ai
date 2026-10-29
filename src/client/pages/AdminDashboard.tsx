/** システム管理者ダッシュボード */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';

const AdminDashboard = ({ user }: { user: any }) => {
  const activeTab = useSignal<'applications' | 'teachers' | 'lectures'>('applications');
  const applications = useSignal<any[]>([]);
  const loading = useSignal(true);
  const error = useSignal('');

  useEffect(() => {
    // TODO: API実装後に読み込み
    loading.value = false;
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('この申請を承認しますか？')) return;
    try {
      await api.post(`/admin/teachers/${id}/approve`);
      // 再読み込み
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('却下理由（任意）');
    try {
      await api.post(`/admin/teachers/${id}/reject`, { reason: reason || '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading.value) return <div class="loading"><div class="spinner"></div></div>;

  return (
    <div class="dashboard-page">
      <div class="page-header">
        <h1 class="page-title">システム管理者</h1>
        <p class="page-subtitle">講座主催者申請の審査・管理</p>
      </div>

      {error.value && <div class="alert alert-error">{error.value}</div>}

      <div class="tabs" role="tablist">
        <button role="tab" class={activeTab.value === 'applications' ? 'active' : ''} onClick={() => activeTab.value = 'applications'}>
          申請一覧 <span class="badge">{applications.value.filter(a => a.status === 'pending').length}</span>
        </button>
        <button role="tab" class={activeTab.value === 'teachers' ? 'active' : ''} onClick={() => activeTab.value = 'teachers'}>
          講座主催者管理
        </button>
        <button role="tab" class={activeTab.value === 'lectures' ? 'active' : ''} onClick={() => activeTab.value = 'lectures'}>
          講座管理
        </button>
      </div>

      <div class="tab-panel">
        {activeTab.value === 'applications' && <ApplicationsTab applications={applications.value} onApprove={handleApprove} onReject={handleReject} />}
        {activeTab.value === 'teachers' && <TeachersTab />}
        {activeTab.value === 'lectures' && <LecturesTab />}
      </div>
    </div>
  );
};

const ApplicationsTab = ({
  applications,
  onApprove,
  onReject,
}: {
  applications: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  const pendingApps = applications.filter(a => a.status === 'pending');

  return (
    <div class="applications-tab">
      {pendingApps.length === 0 ? (
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h2>審査待ちの申請はありません</h2>
        </div>
      ) : (
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>申請日時</th>
                <th>講座名</th>
                <th>メールアドレス</th>
                <th>登録理由</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pendingApps.map((app: any) => (
                <tr key={app.id}>
                  <td>{new Date(app.appliedAt).toLocaleString('ja-JP')}</td>
                  <td>{app.lectureName}</td>
                  <td>{app.email}</td>
                  <td>
                    <div class="reason-text" style={{maxWidth: '300px', wordBreak: 'break-word'}}>
                      {app.reason}
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-primary btn-sm" onClick={() => onApprove(app.id)}>承認</button>
                    <button class="btn btn-danger btn-sm" onClick={() => onReject(app.id)}>却下</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const TeachersTab = () => {
  return (
    <div class="teachers-tab">
      <p class="status-note">実装予定：全講座主催者一覧、ステータス変更等</p>
    </div>
  );
};

const LecturesTab = () => {
  return (
    <div class="lectures-tab">
      <p class="status-note">実装予定：全講座一覧、参加者数、コード確認等</p>
    </div>
  );
};

export default AdminDashboard;