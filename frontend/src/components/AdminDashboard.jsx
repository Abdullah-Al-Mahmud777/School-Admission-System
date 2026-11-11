import { useEffect, useState } from 'react';
import { api, getAdminSession } from '../api';

function shiftKeyOf(shift) {
  return (shift || '').toLowerCase().replace(/[^a-z]/g, '');
}

export default function AdminDashboard({ onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const session = getAdminSession();
  const firstName = (session?.full_name || 'Administrator').split(/\s+/)[0];

  useEffect(() => {
    let active = true;

    api
      .getAdminClasses()
      .then((classData) => {
        if (!active) return;
        setClasses(classData || []);
        setError('');
      })
      .catch((err) => {
        if (!active || err.status === 401) return;
        setError(err?.data?.message || err?.message || 'Unable to load the dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalSeats = classes.reduce((sum, cls) => sum + cls.total_seats, 0);
  const totalHeld = classes.reduce((sum, cls) => sum + cls.held_seats, 0);
  const totalConfirmed = classes.reduce((sum, cls) => sum + cls.confirmed_seats, 0);
  const totalAvailable = classes.reduce((sum, cls) => sum + cls.available_seats, 0);
  const availabilityPct = totalSeats > 0 ? Math.round((totalAvailable / totalSeats) * 100) : 0;
  const utilised = totalSeats - totalAvailable;
  const utilisedPct = totalSeats > 0 ? Math.round((utilised / totalSeats) * 100) : 0;

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="admin-manage-content admin-dashboard">
      <div className="admin-page-heading">
        <div>
          <span className="header-eyebrow">Overview</span>
          <h1 className="admin-page-title">Welcome back, {firstName}</h1>
          <p className="admin-page-subtitle">
            Monitor class capacity, seat availability, and admissions activity across every shift.
          </p>
        </div>
        <span className="admin-date-chip">{today}</span>
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

      <section className="stats-grid admin-stats" aria-label="Admissions overview">
        <div className="stat-card">
          <span className="stat-icon stat-icon-blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3.5 9.5 H20.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Classes</span>
            <span className="stat-value">{loading ? '—' : classes.length}</span>
            <span className="stat-hint">Across all shifts</span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-icon-violet" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 4 V13 H19 V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 13 H20 V19 H4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Total seats</span>
            <span className="stat-value">{loading ? '—' : totalSeats}</span>
            <span className="stat-hint">Available capacity</span>
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
            <span className="stat-label">Seats on hold</span>
            <span className="stat-value">{loading ? '—' : totalHeld}</span>
            <span className="stat-hint">Temporary reservations</span>
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon stat-icon-emerald" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 12 L11 15 L16.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="stat-body">
            <span className="stat-label">Admitted seats</span>
            <span className="stat-value">{loading ? '—' : totalConfirmed}</span>
            <span className="stat-hint">Confirmed admissions</span>
          </span>
        </div>
      </section>

      <div className="admin-dashboard-grid">
        <section className="panel admin-dashboard-panel">
          <div className="section-header">
            <div>
              <h2>Class &amp; shift overview</h2>
              <p className="section-subtitle">Seat capacity and utilisation for every class.</p>
            </div>
            <button
              type="button"
              className="admin-panel-link"
              onClick={() => onNavigate('/admin/classes')}
            >
              Manage classes
            </button>
          </div>

          {loading ? (
            <div className="state-box">Loading classes…</div>
          ) : classes.length === 0 ? (
            <div className="state-box">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3.5 9.5 H20.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              No classes have been created yet.
            </div>
          ) : (
            <div className="classes-table-wrapper">
              <table className="classes-table admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Shift</th>
                    <th>Seats</th>
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

        <section className="panel admin-dashboard-panel">
          <div className="section-header">
            <div>
              <h2>Seat availability</h2>
              <p className="section-subtitle">{totalAvailable} of {totalSeats} seats available.</p>
            </div>
            <span className="section-count">{availabilityPct}% free</span>
          </div>

          <div className="admin-overall-availability">
            <div className="admin-availability-labels">
              <span>Overall utilisation</span>
              <strong>{utilised} / {totalSeats}</strong>
            </div>
            <div className="seat-overview-track">
              <span className="seat-overview-fill" style={{ width: `${utilisedPct}%` }} />
            </div>
          </div>

          {loading ? (
            <div className="state-box">Loading seat availability…</div>
          ) : classes.length === 0 ? (
            <div className="state-box">No classes have been created yet.</div>
          ) : (
            <div className="seat-overview-list">
              {classes.map((cls) => {
                const used = cls.held_seats + cls.confirmed_seats;
                const usedPct = cls.total_seats > 0 ? Math.round((used / cls.total_seats) * 100) : 0;
                const availablePct = cls.total_seats > 0
                  ? Math.round((cls.available_seats / cls.total_seats) * 100)
                  : 0;

                return (
                  <div className="seat-overview-item" key={cls.id}>
                    <div className="seat-overview-top">
                      <span className="seat-overview-name">
                        {cls.name}
                        <span className={`shift-badge shift-${shiftKeyOf(cls.shift)}`}>
                          {cls.shift}
                        </span>
                      </span>
                      <span className="seat-overview-meta">
                        <strong>{cls.available_seats}</strong> / {cls.total_seats} free
                      </span>
                    </div>
                    <div className="seat-overview-track">
                      <span
                        className={`seat-overview-fill ${availablePct === 0 ? 'is-full' : ''}`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="admin-panel-footer">
            <button
              type="button"
              className="admin-panel-link"
              onClick={() => onNavigate('/admin/seats')}
            >
              Open seat management
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
