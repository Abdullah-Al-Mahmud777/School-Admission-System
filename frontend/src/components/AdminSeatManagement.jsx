import { useEffect, useState } from 'react';
import { api } from '../api';

const MAX_SEAT_CAPACITY = 10000;

function shiftKeyOf(shift) {
  return (shift || '').toLowerCase().replace(/[^a-z]/g, '');
}

function occupiedOf(cls) {
  return (cls?.held_seats || 0) + (cls?.confirmed_seats || 0);
}

function extractErrorMessage(error) {
  const data = error?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  return data?.message || error?.message || 'Something went wrong. Please try again.';
}

function validateCapacity(value, cls) {
  const seats = Number(value);
  const occupied = occupiedOf(cls);

  if (value === '' || !Number.isInteger(seats) || seats < 1 || seats > MAX_SEAT_CAPACITY) {
    return `Seat capacity must be a whole number between 1 and ${MAX_SEAT_CAPACITY.toLocaleString()}.`;
  }

  if (seats < occupied) {
    return `Capacity cannot be reduced below ${occupied} currently held or confirmed seat(s).`;
  }

  return '';
}

export default function AdminSeatManagement({ onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [capacityTarget, setCapacityTarget] = useState(null);
  const [capacityValue, setCapacityValue] = useState('');
  const [capacityError, setCapacityError] = useState('');
  const [saving, setSaving] = useState(false);

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
        setError(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!capacityTarget) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || saving) return;
      setCapacityTarget(null);
      setCapacityError('');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [capacityTarget, saving]);

  const totalSeats = classes.reduce((sum, cls) => sum + cls.total_seats, 0);
  const totalHeld = classes.reduce((sum, cls) => sum + cls.held_seats, 0);
  const totalConfirmed = classes.reduce((sum, cls) => sum + cls.confirmed_seats, 0);
  const totalAvailable = classes.reduce((sum, cls) => sum + cls.available_seats, 0);
  const utilised = totalHeld + totalConfirmed;
  const utilisedPct = totalSeats > 0 ? Math.round((utilised / totalSeats) * 100) : 0;

  const reload = () => {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const openCapacityModal = (cls) => {
    setCapacityTarget(cls);
    setCapacityValue(String(cls.total_seats));
    setCapacityError('');
    setNotice('');
  };

  const closeCapacityModal = () => {
    if (saving) return;
    setCapacityTarget(null);
    setCapacityError('');
  };

  const handleCapacityChange = (event) => {
    setCapacityValue(event.target.value);
    setCapacityError('');
  };

  const handleCapacitySave = async (event) => {
    event.preventDefault();
    if (!capacityTarget) return;

    const validationError = validateCapacity(capacityValue, capacityTarget);
    if (validationError) {
      setCapacityError(validationError);
      return;
    }

    const seats = Number(capacityValue);
    setSaving(true);
    setCapacityError('');

    try {
      const updated = await api.updateClass(capacityTarget.id, {
        name: capacityTarget.name,
        shift: capacityTarget.shift,
        total_seats: seats,
      });

      setNotice(
        `Seat capacity for "${updated.name}" (${updated.shift}) updated to ${updated.total_seats}.`,
      );
      setCapacityTarget(null);
      reload();
    } catch (err) {
      if (err.status === 401) return;
      setCapacityError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const capacityOccupied = occupiedOf(capacityTarget);
  const capacityMinimum = Math.max(1, capacityOccupied);

  return (
    <main className="admin-manage-content">
      <div className="admin-page-heading">
        <div>
          <span className="header-eyebrow">Capacity</span>
          <h1 className="admin-page-title">Seat Management</h1>
          <p className="admin-page-subtitle">
            Set total capacity for each class and shift, then monitor held, confirmed, and
            available seats in real time.
          </p>
        </div>
        <div className="admin-heading-actions">
          <button
            type="button"
            className="admin-manage-signout admin-refresh-btn"
            onClick={reload}
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

      {notice && (
        <div className="admin-success-banner" role="status">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.5 10.3 L9 12.8 L13.6 7.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {notice}
          <button
            type="button"
            className="admin-banner-close"
            onClick={() => setNotice('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
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
            <span className="stat-hint">Total − held − confirmed</span>
          </span>
        </div>
      </section>

      <section className="panel admin-classes-panel">
        <div className="section-header">
          <div>
            <h2>Seat allocation by class</h2>
            <p className="section-subtitle">
              {utilised} of {totalSeats} seats are currently held or confirmed. Available capacity
              is calculated automatically.
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const used = occupiedOf(cls);
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
                      <td className="cell-action">
                        <button
                          type="button"
                          className="admin-capacity-btn"
                          onClick={() => openCapacityModal(cls)}
                          aria-label={`Set seat capacity for ${cls.name} (${cls.shift})`}
                          title="Set seat capacity"
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M4 14.5 V16.5 H6 L15.2 7.3 L13.2 5.3 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M11.6 6.9 L13.6 8.9" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                          <span>Set capacity</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {capacityTarget && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCapacityModal();
          }}
        >
          <div
            className="modal admin-capacity-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capacity-modal-title"
          >
            <span className="modal-icon admin-modal-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M5 3.5 V11 H15 V3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 11 H16 V16.5 H4 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M6.5 8 H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="modal-title" id="capacity-modal-title">Set seat capacity</h2>
            <p className="modal-body">
              Update the total seat capacity for <strong>{capacityTarget.name}</strong> (
              {capacityTarget.shift}). Available seats will be recalculated automatically.
            </p>

            <div className="admin-capacity-summary" aria-label="Current seat breakdown">
              <div className="admin-capacity-summary-item">
                <span>Total</span>
                <strong>{capacityTarget.total_seats}</strong>
              </div>
              <div className="admin-capacity-summary-item">
                <span>Held</span>
                <strong>{capacityTarget.held_seats}</strong>
              </div>
              <div className="admin-capacity-summary-item">
                <span>Confirmed</span>
                <strong>{capacityTarget.confirmed_seats}</strong>
              </div>
              <div className="admin-capacity-summary-item is-available">
                <span>Available</span>
                <strong>{capacityTarget.available_seats}</strong>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleCapacitySave} noValidate>
              <div className="admin-field">
                <label htmlFor="capacity-total" className="admin-label">
                  Total seat capacity
                </label>
                <input
                  id="capacity-total"
                  name="total_seats"
                  type="number"
                  min={capacityMinimum}
                  max={MAX_SEAT_CAPACITY}
                  step="1"
                  className="admin-input admin-input-plain"
                  value={capacityValue}
                  onChange={handleCapacityChange}
                  disabled={saving}
                  autoFocus
                  aria-invalid={!!capacityError}
                  aria-describedby="capacity-hint capacity-error"
                />
                <p className="admin-field-hint" id="capacity-hint">
                  Minimum allowed: {capacityMinimum} seat{capacityMinimum === 1 ? '' : 's'}.
                  {capacityOccupied > 0
                    ? ` ${capacityOccupied} seat${capacityOccupied === 1 ? '' : 's'} ${
                        capacityOccupied === 1 ? 'is' : 'are'
                      } already held or confirmed.`
                    : ''}
                </p>
                {capacityError && (
                  <p className="error-msg" id="capacity-error" role="alert">
                    {capacityError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={closeCapacityModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
