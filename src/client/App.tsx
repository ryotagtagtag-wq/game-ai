/** メイン App コンポーネント */

import { useState, useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { Link } from 'preact-router';
import Home from './pages/Home';
import TeacherRegister from './pages/TeacherRegister';
import TeacherLogin from './pages/TeacherLogin';
import TeacherPending from './pages/TeacherPending';
import TeacherRejected from './pages/TeacherRejected';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Join from './pages/Join';
import Waiting from './pages/Waiting';
import GameMaker from './pages/GameMaker';
import MyGames from './pages/MyGames';
import NotFound from './pages/NotFound';
import { api } from './utils/api';
import type { User } from './utils/api';

function App() {
  const user = useSignal<User | null>(null);
  const loading = useSignal(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        user.value = res;
      } catch {
        user.value = null;
      } finally {
        loading.value = false;
      }
    };
    fetchUser();
  }, []);

  const routes = () => {
    if (loading.value) return <Loading />;

    // 認証不要ページ
    if (window.location.pathname === '/' || window.location.pathname === '/teacher/register') {
      return <Home user={user.value} />;
    }
    if (window.location.pathname === '/teacher/login') {
      return <TeacherLogin user={user.value} />;
    }
    if (window.location.pathname === '/join') {
      return <Join user={user.value} />;
    }

    // 認証必要ページ
    if (!user.value) {
      return <NavigateToLogin />;
    }

    // 役割別ルーティング
    if (user.value.role === 'teacher') {
      if (user.value.status === 'pending') return <TeacherPending />;
      if (user.value.status === 'rejected') return <TeacherRejected />;

      switch (window.location.pathname) {
        case '/teacher/dashboard': return <TeacherDashboard user={user.value} />;
        case '/app': return <GameMaker user={user.value} />;
        case '/mygames': return <MyGames user={user.value} />;
        default: return <TeacherDashboard user={user.value} />;
      }
    }

    if (user.value.role === 'admin') {
      if (window.location.pathname.startsWith('/admin')) {
        return <AdminDashboard user={user.value} />;
      }
    }

    if (user.value.role === 'participant') {
      if (user.value.status === 'pending') return <Waiting />;
      switch (window.location.pathname) {
        case '/app': return <GameMaker user={user.value} />;
        case '/mygames': return <MyGames user={user.value} />;
        default: return <GameMaker user={user.value} />;
      }
    }

    return <NotFound />;
  };

  return (
    <div class="app">
      <header class="header" style={{ display: user.value ? 'flex' : 'none' }}>
        <Link href="/" class="logo">AIゲームメーカー</Link>
        <nav class="nav">
          {user.value.role === 'teacher' && user.value.status === 'approved' && (
            <>
              <Link href="/app">ゲーム作成</Link>
              <Link href="/mygames">マイゲーム</Link>
              <Link href="/teacher/dashboard">講座管理</Link>
            </>
          )}
          {user.value.role === 'admin' && (
            <Link href="/admin">管理者</Link>
          )}
          {user.value.role === 'participant' && user.value.status === 'approved' && (
            <>
              <Link href="/app">ゲーム作成</Link>
              <Link href="/mygames">マイゲーム</Link>
            </>
          )}
          <button onClick={logout} class="btn-logout">ログアウト</button>
        </nav>
      </header>
      <main class="main">{routes()}</main>
    </div>
  );
}

function Loading() {
  return (
    <div class="loading">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
  );
}

function NavigateToLogin() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/teacher/login';
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return <Loading />;
}

async function logout() {
  await api.post('/auth/logout');
  window.location.href = '/';
}

export default App;