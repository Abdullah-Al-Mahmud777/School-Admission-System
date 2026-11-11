import { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = ['All', 'Held', 'Confirmed', 'Cancelled', 'Expired', 'Released'];
const CANCELLABLE_STATUSES = new Set(['Held', 'Confirmed']);

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(value) {
  const key = (value || 'unknown').toLowerCase();
  return <span className={`status-badge status-${key}`}>{value || 'Unknown'}</span>;
}

function extractErrorMessage(error) {
  const data = error?.data;
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  return data?.message || error?.message || 'Something went wrong. Please try again.';
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .getAdminApplications()
      .then((data) => {
        if (!active) return;
        setApplications(data || []);
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
    if (!cancelTarget) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || cancelling) return;
      setCancelTarget(null);
      setCancelError('');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelTarget, cancelling]);

  const reload = () => {
    setLoading(true);
    setRefreshKey((value) => value + 1);
  };

  const openCancelModal = (app) => {
    setCancelTarget(app);
    setCancelError('');
    setNotice('');
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setCancelTarget(null);
    setCancelError('');
  };

  const handleCancelApplication = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    setCancelError('');

    try {
      const cancelled = await api.cancelAdminApplication(cancelTarget.id);
      const refundNote =
        cancelled.payment_status === 'Refunded' ? ' The admission fee was marked as refunded.' : '';
      setNotice(
        `Application ${cancelled.student_id} for "${cancelled.class_name || cancelTarget.class_name}" was cancelled.${refundNote}`,
      );
      setCancelTarget(null);
      reload();
    } catch (err) {
      if (err.status === 401) return;
      setCancelError(extractErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = applications.filter((app) => {
    const matchesStatus = status === 'All' || app.status === status;
    const matchesQuery =
      !normalizedQuery ||
      app.student_id.toLowerCase().includes(normalizedQuery) ||
      app.class_name.toLowerCase().includes(normalizedQuery) ||
      app.class_shift.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });

  return (
    <main className="admin-manage-content">
      <div className="admin-page-heading">
        <div>
          <span className="header-eyebrow">Admissions</span>
          <h1 className="admin-page-title">Applications</h1>
          <p className="admin-page-subtitle">
            Review every seat application, payment status, and admission decision in one place.
          </p>
        </div>
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

      <section className="panel admin-applications-panel">
        <div className="section-header">
          <div>
            <h2>All applications</h2>
            <p className="section-subtitle">Search by student ID, class, or shift.</p>
          </div>
          <span className="section-count">
            {filtered.length} of {applications.length} application{applications.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="admin-table-toolbar">
          <div className="admin-search-wrap">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.8" cy="8.8" r="5.3" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12.8 12.8 L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="admin-input admin-input-plain admin-search-input"
              placeholder="Search applications…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search applications"
            />
          </div>
          <select
            className="admin-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by application status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'All' ? 'All statuses' : option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="state-box">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
              <path d="M12 3.5 A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Loading applications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 4 H17 A2 2 0 0 1 19 6 V20 H5 V6 A2 2 0 0 1 7 4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8 8 H16 M8 12 H16 M8 16 H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {applications.length === 0
              ? 'No applications have been submitted yet.'
              : 'No applications match the current search or filter.'}
          </div>
        ) : (
          <div className="classes-table-wrapper">
            <table className="classes-table admin-applications-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Class &amp; shift</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Admission</th>
                  <th>Submitted</th>
                  <th>Expires</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app.id}>
                    <td className="app-mono">{app.student_id}</td>
                    <td>
                      <span className="admin-table-class">{app.class_name}</span>
                      <span className="admin-table-shift">{app.class_shift}</span>
                    </td>
                    <td className="cell-number">{app.quantity}</td>
                    <td>{statusBadge(app.status)}</td>
                    <td>{statusBadge(app.payment_status)}</td>
                    <td>{statusBadge(app.admission_status)}</td>
                    <td className="admin-table-date">{formatDateTime(app.held_at)}</td>
                    <td className="admin-table-date">{formatDateTime(app.expires_at)}</td>
                    <td className="cell-action">
                      {CANCELLABLE_STATUSES.has(app.status) ? (
                        <button
                          type="button"
                          className="admin-application-cancel-btn"
                          onClick={() => openCancelModal(app)}
                          disabled={cancelling}
                          aria-label={`Cancel application ${app.student_id} for ${app.class_name}`}
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="admin-action-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cancelTarget && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCancelModal();
          }}
        >
          <div
            className="modal admin-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-application-title"
          >
            <span className="modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 4 L21 19 H3 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10 V13.5 M12 16.2 V16.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="modal-title" id="cancel-application-title">Cancel application?</h2>
            <p className="modal-body">
              Cancel the application for <strong>{cancelTarget.student_id}</strong> in{' '}
              <strong>{cancelTarget.class_name}</strong> ({cancelTarget.class_shift}). The seat will
              be released immediately
              {cancelTarget.payment_status === 'Paid'
                ? ' and the payment will be marked as refunded'
                : ''}
              . The application and audit history will be retained.
            </p>
            {cancelError && (
              <p className="error-msg" role="alert">
                {cancelError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={closeCancelModal}
                disabled={cancelling}
              >
                Keep application
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={handleCancelApplication}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling…' : 'Cancel application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
