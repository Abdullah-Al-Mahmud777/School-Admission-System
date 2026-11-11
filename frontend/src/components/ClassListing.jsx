import { useState, useEffect, useRef } from 'react';
import { api, getStudentId, clearStudentId } from '../api';

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function HoldCountdown({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let lastNotified = 0;
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0 && Date.now() - lastNotified > 3000) {
        lastNotified = Date.now();
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isExpired = remaining <= 0;
  return (
    <span className={isExpired ? 'countdown countdown-expired' : 'countdown'}>
      {formatRemaining(remaining)}
    </span>
  );
}

const fmtDate = (iso) => new Date(iso).toLocaleString();

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const shiftKeyOf = (shift) => (shift || '').toLowerCase().replace(/[^a-z]/g, '');
const normalizeStatus = (value) => (value || '').toString().trim().toUpperCase();

export default function ClassListing({ onSignOut }) {
  const [classes, setClasses] = useState([]);
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingClassId, setApplyingClassId] = useState(null);
  const [payingHoldId, setPayingHoldId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingHoldId, setCancellingHoldId] = useState(null);
  const [activeSection, setActiveSection] = useState('classes');
  const [now, setNow] = useState(() => Date.now());

  const loadClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Failed to load classes.');
    } finally {
      setLoading(false);
    }
  };

  const loadHolds = async () => {
    try {
      const data = await api.getMyHolds();
      setHolds(data);
    } catch (err) {
      setError(err.message || 'Failed to load your applications.');
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        const [classData, holdData] = await Promise.all([
          api.getClasses(),
          api.getMyHolds(),
        ]);
        if (!active) return;
        setClasses(classData);
        setHolds(holdData);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load classes.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [classData, holdData] = await Promise.all([
          api.getClasses(),
          api.getMyHolds(),
        ]);
        setClasses(classData);
        setHolds(holdData);
      } catch (err) {
        setError(err.message || 'Failed to refresh class and application data.');
      }
    }, 5000);

    return () => clearInterval(id);
  }, []);

  const handleApplyNow = async (classId) => {
    setApplyingClassId(classId);
    setError('');
    try {
      await api.createHold(classId, 1);
      setApplyingClassId(null);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setApplyingClassId(null);
      if (err.status === 409) {
        setError(err.message || 'No seats are currently available for this class.');
        await loadClasses();
        await loadHolds();
        return;
      }
      setError(err.message || 'Failed to apply for admission.');
    }
  };

  const handleConfirm = async (holdId) => {
    try {
      await api.confirmHold(holdId);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setError(err.message || 'Failed to confirm hold.');
    }
  };

  const handleRelease = async (holdId) => {
    try {
      await api.releaseHold(holdId);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setError(err.message || 'Failed to cancel application.');
    }
  };

  const handlePay = async (holdId) => {
    setPayingHoldId(holdId);
    setError('');
    try {
      await api.payHold(holdId);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setError(err.message || 'Failed to process admission fee.');
      await loadHolds();
    } finally {
      setPayingHoldId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    const holdId = cancelTarget.id;
    setCancellingHoldId(holdId);
    setError('');
    try {
      await api.cancelHold(holdId);
      setCancelTarget(null);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setError(err.message || 'Failed to cancel admission.');
      setCancelTarget(null);
      await loadHolds();
    } finally {
      setCancellingHoldId(null);
    }
  };

  const refreshInFlight = useRef(false);

  const handleHoldExpired = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      await loadClasses();
      await loadHolds();
    } finally {
      refreshInFlight.current = false;
    }
  };

  const goToSection = (sectionId, sectionKey) => {
    setActiveSection(sectionKey);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const studentId = getStudentId();
  const activeHoldClassIds = new Set(
    holds
      .filter((h) => {
        const status = normalizeStatus(h.status);
        return status === 'HELD' || status === 'CONFIRMED';
      })
      .map((h) => h.class_id)
  );

  const totalAvailableSeats = classes.reduce((sum, cls) => sum + (cls.available_seats || 0), 0);
  const activeApplications = holds.filter(
    (h) => {
      const status = normalizeStatus(h.status);
      return status === 'HELD' || status === 'CONFIRMED';
    }
  ).length;
  const admittedCount = holds.filter((h) => h.admission_status === 'Admitted').length;

  return (
    <div className="class-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3 L4 8 L12 13 L20 8 Z" fill="#ffffff" />
              <path d="M6 12.5 V17 C6 18.6 8.7 20 12 20 C15.3 20 18 18.6 18 17 V12.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-name">School Admission</span>
            <span className="brand-tag">Student Portal</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Student panel navigation">
          <span className="nav-label">Menu</span>
          <a
            href="#classes-section"
            className={`nav-item ${activeSection === 'classes' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); goToSection('classes-section', 'classes'); }}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Classes &amp; Shifts
          </a>
          <a
            href="#applications-section"
            className={`nav-item ${activeSection === 'applications' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); goToSection('applications-section', 'applications'); }}
          >
            <svg className="nav-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6 3.5 H14 A1.5 1.5 0 0 1 15.5 5 V16.5 H4.5 V5 A1.5 1.5 0 0 1 6 3.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7.5 2.5 H12.5 V5 H7.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7.5 9.5 L9.2 11.2 L12.8 7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            My Applications
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="student-card">
            <span className="student-avatar" aria-hidden="true">{studentId?.slice(-2)}</span>
            <span className="student-meta">
              <span className="student-meta-label">Student ID</span>
              <span className="student-meta-value">{studentId}</span>
            </span>
          </div>
          <button className="signout-btn" aria-label="Sign out" title="Sign out" onClick={() => { clearStudentId(); onSignOut(); }}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 14 V16 A1.5 1.5 0 0 1 10.5 17.5 H4.5 A1.5 1.5 0 0 1 3 16 V4 A1.5 1.5 0 0 1 4.5 2.5 H10.5 A1.5 1.5 0 0 1 12 4 V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M8.5 10 H17 M14 7 L17 10 L14 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="signout-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="class-main">
        <header className="class-header">
          <div className="header-content">
            <div className="header-titles">
              <span className="header-eyebrow">Student Dashboard</span>
              <h1 className="header-title">Admission Panel</h1>
            </div>
            <div className="student-info">
              <span className="student-id-label">Student ID</span>
              <span className="student-id-value">{studentId}</span>
            </div>
          </div>
        </header>

        <main className="class-content">
          {error && (
            <div className="error-banner" role="alert">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 6.5 V10.5 M10 13.4 V13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <section className="stats-grid" aria-label="Admission overview">
            <div className="stat-card">
              <span className="stat-icon stat-icon-blue" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 10 L12 4 L20 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 11 V19 H18 V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 19 V14 H14 V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="stat-body">
                <span className="stat-label">Classes Open</span>
                <span className="stat-value">{classes.length}</span>
                <span className="stat-hint">Across all shifts</span>
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
                <span className="stat-label">Seats Available</span>
                <span className="stat-value">{totalAvailableSeats}</span>
                <span className="stat-hint">Ready to be filled</span>
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-icon stat-icon-violet" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8 4 H16 A2 2 0 0 1 18 6 V20 H6 V6 A2 2 0 0 1 8 4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9.5 2.5 H14.5 V5.5 H9.5 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 11.5 L10.8 13.3 L14.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="stat-body">
                <span className="stat-label">Active Applications</span>
                <span className="stat-value">{activeApplications}</span>
                <span className="stat-hint">Held or confirmed</span>
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-icon stat-icon-amber" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8.5 13.5 L7.5 21 L12 18.8 L16.5 21 L15.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="stat-body">
                <span className="stat-label">Admitted</span>
                <span className="stat-value">{admittedCount}</span>
                <span className="stat-hint">Fee paid &amp; confirmed</span>
              </span>
            </div>
          </section>

          <section className="classes-section panel" id="classes-section">
            <div className="section-header">
              <div>
                <h2>Classes &amp; Shifts</h2>
                <p className="section-subtitle">Select a class and shift to begin the admission application.</p>
              </div>
              <span className="section-count">{classes.length} class{classes.length === 1 ? '' : 'es'}</span>
            </div>

            {loading ? (
              <div className="state-box">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" opacity="0.3" />
                  <path d="M12 3.5 A8.5 8.5 0 0 1 20.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Loading classes…
              </div>
            ) : classes.length === 0 ? (
              <div className="state-box">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3.5 9.5 H20.5" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                No classes available.
              </div>
            ) : (
              <div className="classes-table-wrapper">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Shift</th>
                      <th>Total Seats</th>
                      <th>Held</th>
                      <th>Confirmed</th>
                      <th>Available</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => {
                      const hasActiveHold = activeHoldClassIds.has(cls.id);
                      const isFull = cls.available_seats <= 0;
                      const occupied = cls.total_seats - cls.available_seats;
                      const occupancy = cls.total_seats > 0
                        ? Math.min(100, Math.max(0, Math.round((occupied / cls.total_seats) * 100)))
                        : 0;
                      return (
                        <tr key={cls.id} className={isFull ? 'row-full' : ''}>
                          <td className="cell-name">
                            <span className="class-avatar" aria-hidden="true">{initialsOf(cls.name)}</span>
                            <span className="class-name-wrap">
                              <span className="class-name">{cls.name}</span>
                              <span
                                className="progress"
                                role="img"
                              >
                                <span
                                  className={`progress-bar ${isFull ? 'progress-bar-full' : ''}`}
                                  style={{ width: `${occupancy}%` }}
                                />
                              </span>
                            </span>
                          </td>
                          <td className="cell-shift">
                            <span className={`shift-badge shift-${shiftKeyOf(cls.shift)}`}>{cls.shift}</span>
                          </td>
                          <td className="cell-number">{cls.total_seats}</td>
                          <td className="cell-number"><span className="num-held">{cls.held_seats}</span></td>
                          <td className="cell-number"><span className="num-confirmed">{cls.confirmed_seats}</span></td>
                          <td className="cell-available">
                            <span className={`seat-pill ${isFull ? 'available-full' : 'available-ok'}`}>
                              {cls.available_seats}
                            </span>
                          </td>
                          <td className="cell-action">
                            {hasActiveHold ? (
                              <span className="status-chip status-active">Applied</span>
                            ) : isFull ? (
                              <button disabled className="apply-btn apply-full">Full</button>
                            ) : (
                              <button
                                onClick={() => handleApplyNow(cls.id)}
                                disabled={applyingClassId === cls.id}
                                className="apply-btn"
                              >
                                {applyingClassId === cls.id ? 'Applying…' : 'Apply Now'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="holds-section panel" id="applications-section">
            <div className="section-header">
              <div>
                <h2>My Applications</h2>
                <p className="section-subtitle">Your active seat holds, payments, and admission records.</p>
              </div>
              <span className="section-count">{holds.length} record{holds.length === 1 ? '' : 's'}</span>
            </div>
            {holds.length === 0 ? (
              <div className="state-box">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 4 H17 A2 2 0 0 1 19 6 V20 H5 V6 A2 2 0 0 1 7 4 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 2.5 H15 V5.5 H9 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M8.5 11 H15.5 M8.5 15 H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                No active applications.
              </div>
            ) : (
              <div className="holds-list">
                {holds.map((hold) => {
                  const holdStatus = normalizeStatus(hold.status) || 'UNKNOWN';
                  const paymentStatus = hold.payment_status || 'Unpaid';
                  const admissionStatus = hold.admission_status || 'Pending';
                  const isPaid = paymentStatus === 'Paid';
                  const isPayableStatus = holdStatus === 'HELD' || holdStatus === 'CONFIRMED';
                  const isPastExpiry = new Date(hold.expires_at).getTime() <= now;
                  const holdExpired =
                    !isPaid &&
                    (holdStatus === 'EXPIRED' || (isPayableStatus && isPastExpiry));
                  const canPay = !isPaid && isPayableStatus && !holdExpired;
                  const isMuted =
                    holdStatus === 'CANCELLED' || holdStatus === 'EXPIRED' || holdStatus === 'RELEASED';

                  return (
                    <div
                      key={hold.id}
                      className={`hold-card ${isMuted ? 'hold-card-muted' : ''}`}
                    >
                      <div className="hold-head">
                        <div className="hold-title-row">
                          <span className="class-avatar sm" aria-hidden="true">
                            {initialsOf(hold.class_name || 'Class')}
                          </span>
                          <span className="hold-title-copy">
                            <span className="hold-class">{hold.class_name || hold.class_id}</span>
                            <span className="hold-qty">
                              {hold.quantity} seat{hold.quantity === 1 ? '' : 's'} reserved
                            </span>
                          </span>
                        </div>
                        <span className={`badge status-badge status-${holdStatus.toLowerCase()}`}>
                          {holdStatus}
                        </span>
                      </div>

                      <div className="hold-badges">
                        <span className={`badge payment-${paymentStatus.toLowerCase()}`}>
                          Payment: {paymentStatus}
                        </span>
                        <span className={`badge admission-${admissionStatus.toLowerCase()}`}>
                          Admission: {admissionStatus}
                        </span>
                        {holdStatus === 'HELD' && (
                          <span className="timer">
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.7" />
                              <path d="M10 6 V10 L12.8 11.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <HoldCountdown expiresAt={hold.expires_at} onExpire={handleHoldExpired} />
                          </span>
                        )}
                      </div>

                      <dl className="hold-meta">
                        <div>
                          <dt>Held At</dt>
                          <dd>{fmtDate(hold.held_at)}</dd>
                        </div>
                        <div>
                          <dt>Expires At</dt>
                          <dd>{fmtDate(hold.expires_at)}</dd>
                        </div>
                        {hold.confirmed_at && (
                          <div>
                            <dt>Confirmed At</dt>
                            <dd>{fmtDate(hold.confirmed_at)}</dd>
                          </div>
                        )}
                        {hold.paid_at && (
                          <div>
                            <dt>Paid At</dt>
                            <dd>{fmtDate(hold.paid_at)}</dd>
                          </div>
                        )}
                        {hold.cancelled_at && (
                          <div>
                            <dt>Cancelled At</dt>
                            <dd>{fmtDate(hold.cancelled_at)}</dd>
                          </div>
                        )}
                      </dl>

                      <div className="hold-actions">
                        {holdStatus === 'HELD' && (
                          <>
                            <button onClick={() => handleConfirm(hold.id)} className="confirm-btn">Confirm</button>
                            <button onClick={() => handleRelease(hold.id)} className="release-btn">Cancel</button>
                          </>
                        )}
                        {isPaid ? (
                          <span className="paid-chip">PAID</span>
                        ) : canPay ? (
                          <button
                            onClick={() => handlePay(hold.id)}
                            disabled={payingHoldId === hold.id}
                            className="pay-btn"
                          >
                            {payingHoldId === hold.id ? 'Processing…' : 'Pay Admission Fee'}
                          </button>
                        ) : holdExpired ? (
                          <button disabled className="pay-btn pay-disabled">Payment Expired</button>
                        ) : null}
                        {holdStatus === 'CONFIRMED' && (
                          <button
                            onClick={() => setCancelTarget(hold)}
                            disabled={!!cancellingHoldId}
                            className="cancel-btn"
                          >
                            Cancel Admission
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <footer className="class-footer">
          <p>&copy; 2026 School Admission System. All rights reserved.</p>
        </footer>
      </div>

      {cancelTarget && (
        <div
          className="modal-overlay"
          onClick={() => { if (!cancellingHoldId) setCancelTarget(null); }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="modal-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 4 L21 19 H3 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10 V13.5 M12 16.2 V16.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </span>
            <h3 id="cancel-modal-title" className="modal-title">Cancel Admission?</h3>
            <p className="modal-body">
              You are about to cancel your admission for{' '}
              <strong>{cancelTarget.class_name || cancelTarget.class_id}</strong>.
              {cancelTarget.payment_status === 'Paid'
                ? ' Your seat will be released and your admission fee will be refunded.'
                : ' Your held seat will be released.'}{' '}
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setCancelTarget(null)}
                disabled={!!cancellingHoldId}
              >
                Keep Admission
              </button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={handleCancelConfirm}
                disabled={!!cancellingHoldId}
              >
                {cancellingHoldId ? 'Cancelling…' : 'Cancel Admission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
