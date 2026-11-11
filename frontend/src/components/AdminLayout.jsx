import { useEffect, useState } from 'react';
import { getAdminSession } from '../api';

const COLLAPSE_KEY = 'school_admission_admin_sidebar_collapsed';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    isActive: (path) =>
      path === '/admin' ||
      path === '/admin/dashboard' ||
      !['/admin/classes', '/admin/seats'].includes(path),
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    label: 'Class & Shift Management',
    path: '/admin/classes',
    isActive: (path) => path === '/admin/classes',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2.5" y="4" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 8 H17.5 M6.5 4 V2.5 M13.5 4 V2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M6 11.5 H9 M6 14 H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Seat Management',
    path: '/admin/seats',
    isActive: (path) => path === '/admin/seats',
    icon: (
      <svg className="nav-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 3.5 V11 H15 V3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 11 H16 V16.5 H4 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M6.5 8 H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

function initialsOf(value) {
  return (
    (value || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'A'
  );
}

export default function AdminLayout({ path, onNavigate, onSignOut, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const session = getAdminSession();
  const adminName = session?.full_name || 'Administrator';
  const adminEmail = session?.email || '';

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      // Sidebar preference is best-effort.
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const handleNav = (event, targetPath) => {
    event.preventDefault();
    onNavigate(targetPath);
    setMobileOpen(false);
  };

  return (
    <div
      className={`admin-shell ${collapsed ? 'is-collapsed' : ''} ${
        mobileOpen ? 'is-mobile-open' : ''
      }`}
    >
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <a
            href="/admin/dashboard"
            className="admin-sidebar-brand-link"
            onClick={(event) => handleNav(event, '/admin/dashboard')}
            aria-label="Go to admin dashboard"
          >
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 L4 8 L12 13 L20 8 Z" fill="#ffffff" />
                <path
                  d="M6 12.5 V17 C6 18.6 8.7 20 12 20 C15.3 20 18 18.6 18 17 V12.5"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
            <span className="brand-copy">
              <span className="brand-name">School Admission</span>
              <span className="brand-tag">Admin Portal</span>
            </span>
          </a>
          <button
            type="button"
            className="admin-sidebar-collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 5 L7.5 10 L12.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <span className="nav-label">Menu</span>
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(path);
            return (
              <a
                key={item.path}
                href={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={(event) => handleNav(event, item.path)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                <span className="nav-text">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="admin-sidebar-avatar" aria-hidden="true">
              {initialsOf(adminName)}
            </span>
            <span className="admin-sidebar-user-meta">
              <span className="admin-sidebar-user-name">{adminName}</span>
              <span className="admin-sidebar-user-email">{adminEmail}</span>
            </span>
          </div>
          <button
            type="button"
            className="signout-btn admin-sidebar-logout"
            onClick={onSignOut}
            aria-label="Log out"
            title="Log out"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12 14 V16 A1.5 1.5 0 0 1 10.5 17.5 H4.5 A1.5 1.5 0 0 1 3 16 V4 A1.5 1.5 0 0 1 4.5 2.5 H10.5 A1.5 1.5 0 0 1 12 4 V6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M8.5 10 H17 M14 7 L17 10 L14 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="signout-label">Logout</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="admin-shell-main">
        <header className="admin-mobile-header">
          <button
            type="button"
            className="admin-mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5.5 H17 M3 10 H17 M3 14.5 H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <span className="admin-mobile-brand">
            <span className="brand-name">School Admission</span>
            <span className="brand-tag">Admin Portal</span>
          </span>
          <span className="admin-mobile-avatar" aria-hidden="true">
            {initialsOf(adminName)}
          </span>
        </header>

        {children}
      </div>
    </div>
  );
}
