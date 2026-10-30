/** システム管理者ダッシュボード */

import { useSignal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { api } from '../utils/api';
import type { Teacher, Lecture } from '../../shared';

const AdminDashboard = ({ user }: { user: any }) => {
  const activeTab = useSignal<'applications' | 'teachers' | 'lectures'>('applications');
  const applications = useSignal<Teacher[]>([]);
  const teachers = useSignal<Teacher[]>([]);
  const lectures = useSignal<import('../../shared').Lecture[]>([]);
  const loading = useSignal(true);
  const error = useSignal('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, teachersRes, lecturesRes] = await Promise.all([
          api.get<{ teachers: Teacher[] }>('/admin/teachers?status=pending'),
          api.get<{ teachers: Teacher[] }>('/admin/teachers?status=all'),
          api.get<{ lectures: import('../../shared').Lecture[] }>('/admin/lectures'),
        ]);
        applications.value = appsRes.teachers;
        teachers.value = teachersRes.teachers;
        lectures.value = lecturesRes.lectures;
      } catch (err: any) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('この申請を承認しますか？')) return;
    try {
      await api.post(`/admin/teachers/${id}/approve`);
      // 再読み込み
      const [appsRes, teachersRes] = await Promise.all([
        api.get<{ teachers: Teacher[] }>('/admin/teachers?status=pending'),
        api.get<{ teachers: Teacher[] }>('/admin/teachers?status=all'),
      ]);
      applications.value = appsRes.teachers;
      teachers.value = teachersRes.teachers;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('却下理由（任意）');
    try {
      await api.post(`/admin/teachers/${id}/reject`, { reason: reason || '' });
      const [appsRes, teachersRes] = await Promise.all([
        api.get<{ teachers: Teacher[] }>('/admin/teachers?status=pending'),
        api.get<{ teachers: Teacher[] }>('/admin/teachers?status=all'),
      ]);
      applications.value = appsRes.teachers;
      teachers.value = teachersRes.teachers;
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
        {activeTab.value === 'teachers' && <TeachersTab teachers={teachers.value} />}
        {activeTab.value === 'lectures' && <LecturesTab lectures={lectures.value} />}
      </div>
    </div>
  );
};

const ApplicationsTab = ({
  applications,
  onApprove,
  onReject,
}: {
  applications: Teacher[];
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
              {pendingApps.map((app: Teacher) => (
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

const TeachersTab = ({ teachers }: { teachers: Teacher[] }) => {
  return (
    <div class="teachers-tab">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>講座名</th>
              <th>メールアドレス</th>
              <th>ステータス</th>
              <th>申請日時</th>
              <th>審査日時</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)'}}>
                講座主催者がいません
              </td></tr>
            ) : (
              teachers.map((t: Teacher) => (
                <tr key={t.id}>
                  <td>{t.lectureName}</td>
                  <td>{t.email}</td>
                  <td><span class={`badge badge-${t.status}`}>{t.status === 'pending' ? '承認待ち' : t.status === 'approved' ? '承認済み' : '却下'}</span></td>
                  <td>{new Date(t.appliedAt).toLocaleString('ja-JP')}</td>
                  <td>{t.reviewedAt ? new Date(t.reviewedAt).toLocaleString('ja-JP') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LecturesTab = ({ lectures }: { lectures: import('../../shared').Lecture[] }) => {
  return (
    <div class="lectures-tab">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>講座名</th>
              <th>講座コード</th>
              <th>講座主催者</th>
              <th>有効期限</th>
              <th>デフォルト上限</th>
              <th>作成日</th>
            </tr>
          </thead>
          <tbody>
            {lectures.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)'}}>
                講座がありません
              </td></tr>
            ) : (
              lectures.map((l: import('../../shared').Lecture) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td><code>{l.code}</code></td>
                  <td>{l.teacherId}</td>
                  <td>{new Date(l.expiresAt).toLocaleDateString('ja-JP')}</td>
                  <td>{l.defaultGenLimit}</td>
                  <td>{new Date(l.createdAt).toLocaleDateString('ja-JP')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;