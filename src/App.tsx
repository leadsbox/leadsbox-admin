import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { API_BASE, api } from './lib/api';
import { setAdminToken } from './lib/storage';
import type { AuthUser } from './types/subscribers';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import SubscribersPage from './pages/SubscribersPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import OrganizationsPage from './pages/OrganizationsPage';

const App = () => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await api.get('/admin/auth/me');
        const nextUser = (response?.data?.data?.user || null) as AuthUser | null;
        if (!nextUser) {
          throw new Error('Session user not found.');
        }
        setUser(nextUser);
      } catch {
        setAdminToken('');
        setUser(null);
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user?.email), [user?.email]);

  const handleLogin = async (identifier: string, password: string) => {
    const loginResponse = await api.post('/admin/auth/login', { identifier, password });
    const payload = loginResponse?.data?.data || {};
    const profile = (payload.profile || null) as AuthUser | null;
    const nextToken = (payload.token || payload?.profile?.token || '').trim();

    if (!profile || !nextToken) {
      throw new Error('Login response is missing token/profile.');
    }

    setAdminToken(nextToken);
    setUser(profile);
  };

  const handleGoogleLogin = () => {
    const next = encodeURIComponent('/overview');
    window.location.assign(`${API_BASE}/admin/auth/google?next=${next}`);
  };

  const handleLogout = async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch {
      // Swallow logout errors and clear local auth state anyway.
    } finally {
      setAdminToken('');
      setUser(null);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/login'
          element={
            isAuthenticated ? (
              <Navigate to='/overview' replace />
            ) : (
              <LoginPage onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />
            )
          }
        />

        <Route
          element={
            <ProtectedRoute ready={ready} isAuthenticated={isAuthenticated}>
              <AdminLayout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to='/overview' replace />} />
          <Route path='/overview' element={<OverviewPage />} />
          <Route path='/users' element={<UsersPage />} />
          <Route path='/organizations' element={<OrganizationsPage />} />
          <Route path='/subscribers' element={<SubscribersPage />} />
        </Route>

        <Route
          path='*'
          element={
            <Navigate to={isAuthenticated ? '/overview' : '/login'} replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
