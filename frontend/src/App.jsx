import { useCallback, useEffect, useState } from 'react';
import StudentIdentification from './components/StudentIdentification';
import ClassListing from './components/ClassListing';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import AdminClassManagement from './components/AdminClassManagement';
import AdminSeatManagement from './components/AdminSeatManagement';
import {
  api,
  getAdminSession,
  saveAdminSession,
  clearAdminSession,
  ADMIN_UNAUTHORIZED_EVENT,
} from './api';
import './App.css'

const ADMIN_DASHBOARD = '/admin/dashboard';
const ADMIN_LOGIN = '/admin/login';
const ADMIN_PAGES = ['/admin/dashboard', '/admin/classes', '/admin/seats'];

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

function isAdminPath(path) {
  return path === '/admin' || path.startsWith('/admin/');
}

function App() {
  const [page, setPage] = useState('identification');
  const [path, setPath] = useState(currentPath);
  const [adminSession, setAdminSession] = useState(() => getAdminSession());

  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    if (currentPath() !== nextPath) {
      if (replace) {
        window.history.replaceState({}, '', nextPath);
      } else {
        window.history.pushState({}, '', nextPath);
      }
    }
    setPath(nextPath);
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(currentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAdminSession();
      setAdminSession(null);
      navigate(ADMIN_LOGIN, { replace: true });
    };

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [navigate]);

  useEffect(() => {
    if (!adminSession) return undefined;

    const timer = window.setInterval(() => {
      const session = getAdminSession();
      if (!session) {
        setAdminSession(null);
        navigate(ADMIN_LOGIN, { replace: true });
      }
    }, 30000);

    return () => window.clearInterval(timer);
  }, [adminSession, navigate]);

  const adminRoute = isAdminPath(path);

  useEffect(() => {
    if (!adminRoute) return;
    const target = !adminSession
      ? ADMIN_LOGIN
      : ADMIN_PAGES.includes(path)
        ? null
        : ADMIN_DASHBOARD;

    if (target && path !== target) {
      window.history.replaceState({}, '', target);
    }
  }, [adminRoute, adminSession, path]);

  const handleAdminLogin = useCallback(
    async ({ email, password, remember }) => {
      const auth = await api.adminLogin(email, password);
      setAdminSession(saveAdminSession(auth, { remember }));
      navigate(ADMIN_DASHBOARD, { replace: true });
    },
    [navigate],
  );

  const handleAdminSignOut = useCallback(() => {
    clearAdminSession();
    setAdminSession(null);
    navigate(ADMIN_LOGIN, { replace: true });
  }, [navigate]);

  if (adminRoute) {
    if (!adminSession) {
      return <AdminLogin onLogin={handleAdminLogin} />;
    }

    let adminPage = <AdminDashboard onNavigate={navigate} />;

    if (path === '/admin/classes') {
      adminPage = <AdminClassManagement onSignOut={handleAdminSignOut} />;
    } else if (path === '/admin/seats') {
      adminPage = <AdminSeatManagement onNavigate={navigate} />;
    }

    return (
      <AdminLayout path={path} onNavigate={navigate} onSignOut={handleAdminSignOut}>
        {adminPage}
      </AdminLayout>
    );
  }

  return (
    <div id="root">
      {page === 'identification' ? (
        <StudentIdentification onIdentified={() => setPage('classes')} />
      ) : (
        <ClassListing onSignOut={() => setPage('identification')} />
      )}
    </div>
  );
}

export default App;
