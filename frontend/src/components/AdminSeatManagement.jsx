import { useEffect, useState } from 'react';
import { api } from '../api';

function shiftKeyOf(shift) {
  return (shift || '').toLowerCase().replace(/[^a-z]/g, '');
}

export default function AdminSeatManagement({ onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    api
      .getAdminClasses()
      .then((data) => {
        if (!active) return;
        setClasses(data || []);
        setError('');
      })
      .catch((err) => {
        if (!active || err.status === 401) return;
        setError(err?.data?.message || err?.message || 'Unable to load seat information.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const totalSeats = classes.reduce((sum, cls) => sum + cls.total_seats, 0);
  const totalHeld = classes.reduce((sum, cls) => sum + cls.held_seats, 0);
  const totalConfirmed = classes.reduce((sum, cls) => sum + cls.confirmed_seats, 0);
  const totalAvailable = classes.reduce((sum, cls) => sum + cls.available_seats, 0);
  const utilised = totalHeld + totalConfirmed;
  const utilisedPct = totalSeats > 0 ? Math.round((utilised / totalSeats) * 100) : 0;

  return (
    <main className="admin-manage-content">
      <div className="admin-page-heading">
        <div>
          <span className="header-eyebrow">Capacity</span>
          <h1 className="admin-page-title">Seat Management</h1>
          <p className="admin-page-subtitle">
            Track held, confirmed, and available seats for every class and shift.
          </p>
        </div>
        <div className="admin-heading-actions">
          <button
            type="button"
            className="admin-manage-signout admin-refresh-btn"
            onClick={() => {
              setLoading(true);
              setRefreshKey((value) => value + 1);
            }}
            disabled={loading}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M16.5 10 A6.5 6.5 0 1 1 14.6 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M14.6 2.8 V5.4 H17.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="apply-btn admin-add-btn"
            onClick={() => onNavigate('/admin/classes')}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 14.5 V16.5 H6 L15.2 7.3 L13.2 5.3 Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M11.6 6.9 L13.6 8.9" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            Manage classes
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6.5 V10.5 M10 13.4 V13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      <section className="stats-grid admin-stats" aria-label="Seat overview">
        <div className="stat-card">
          <span className="stat-icon stat-icon-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 4 V13 H19 V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 13 H20 V19 H4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Total seats</span>
            <span className="stat-value">{loading ? '—' : totalSeats}</span>
            <span className="stat-hint">Across {classes.length} class{classes.length === 1 ? '' : 'es'}</span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-icon-amber" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7 V12.4 L15.4 14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Held seats</span>
            <span className="stat-value">{loading ? '—' : totalHeld}</span>
            <span className="stat-hint">Temporary reservations</span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-icon-violet" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 12 L11 15 L16.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Confirmed seats</span>
            <span className="stat-value">{loading ? '—' : totalConfirmed}</span>
            <span className="stat-hint">Locked admissions</span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-icon-emerald" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 12 L10 17 L19 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Available seats</span>
            <span className="stat-value">{loading ? '—' : totalAvailable}</span>
            <span className="stat-hint">Ready for new applications</span>
          </span>
        </div>
      </section>

      <section className="panel admin-classes-panel">
        <div className="section-header">
          <div>
            <h2>Seat allocation by class</h2>
            <p className="section-subtitle">
              {utilised} of {totalSeats} seats are currently held or confirmed.
            </p>
          </div>
          <span className="section-count">{utilisedPct}% utilised</span>
        </div>

        {loading ? (
          <div className="state-box">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
              <path d="M12 3.5 A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Loading seat information…
          </div>
        ) : classes.length === 0 ? (
          <div className="state-box">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 4 V13 H19 V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 13 H20 V19 H4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            No classes have been created yet.
          </div>
        ) : (
          <div className="classes-table-wrapper">
            <table className="classes-table admin-seat-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Shift</th>
                  <th>Total</th>
                  <th>Held</th>
                  <th>Confirmed</th>
                  <th>Available</th>
                  <th>Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const used = cls.held_seats + cls.confirmed_seats;
                  const usedPct = cls.total_seats > 0 ? Math.round((used / cls.total_seats) * 100) : 0;

                  return (
                    <tr key={cls.id}>
                      <td>
                        <span className="class-name">{cls.name}</span>
                      </td>
                      <td className="cell-shift">
                        <span className={`shift-badge shift-${shiftKeyOf(cls.shift)}`}>{cls.shift}</span>
                      </td>
                      <td className="cell-number">{cls.total_seats}</td>
                      <td className="cell-number"><span className="num-held">{cls.held_seats}</span></td>
                      <td className="cell-number"><span className="num-confirmed">{cls.confirmed_seats}</span></td>
                      <td className="cell-available">
                        <span className={`seat-pill ${cls.available_seats > 0 ? 'available-ok' : 'available-full'}`}>
                          {cls.available_seats}
                        </span>
                      </td>
                      <td>
                        <div className="admin-utilisation-cell">
                          <span className="progress">
                            <span
                              className={`progress-bar ${usedPct >= 100 ? 'progress-bar-full' : ''}`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </span>
                          <span className="admin-utilisation-value">{usedPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
