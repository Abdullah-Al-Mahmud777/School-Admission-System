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

export default function ClassListing({ onSignOut }) {
  const [classes, setClasses] = useState([]);
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingClassId, setApplyingClassId] = useState(null);
  const [payingHoldId, setPayingHoldId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingHoldId, setCancellingHoldId] = useState(null);
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
      console.error('Failed to load holds:', err);
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
      setError(err.message || 'Failed to release hold.');
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

  const studentId = getStudentId();
  const activeHoldClassIds = new Set(
    holds.filter(h => h.status === 'Held' || h.status === 'Confirmed').map(h => h.class_id)
  );

  return (
    <div className="class-page">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg viewBox="0 0 32 32" aria-label="School logo" className="sidebar-logo">
            <path d="M16 2 L8 10 L16 18 L24 10 Z" fill="#2563eb" />
            <path d="M6 20 H26 V30 H6 Z" fill="#2563eb" />
            <rect x="12" y="22" width="8" height="4" fill="#fbbf24" rx="2" />
          </svg>
          <span className="sidebar-brand-text">School Admission</span>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active" onClick={(e) => e.preventDefault()}>
            <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2" rx="2" />
              <path d="M8 8 L12 12 M12 8 L8 12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Classes & Shifts
          </a>
          <a href="#" className="nav-item" onClick={(e) => e.preventDefault()}>
            <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3 L17 17 M17 3 L3 17" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
              <rect x="3" y="11" width="7" height="6" fill="none" stroke="#64748b" strokeWidth="2" rx="1" />
              <rect x="10" y="11" width="7" height="6" fill="none" stroke="#64748b" strokeWidth="2" rx="1" />
            </svg>
            My Applications
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="student-id-badge">
            <span className="badge-label">Student ID</span>
            <span className="badge-value">{studentId}</span>
          </div>
          <button className="signout-btn" onClick={() => { clearStudentId(); onSignOut(); }}>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="class-main">
        <header className="class-header">
          <div className="header-content">
            <div className="brand">
              <svg viewBox="0 0 32 32" aria-label="School logo">
                <circle cx="16" cy="10" r="6" fill="none" stroke="#2563eb" strokeWidth="2" />
                <path d="M10 20 Q16 12 22 20" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>SCHOOL ADMISSION</span>
            </div>
            <div className="student-info">
              <span className="student-id-label">Student ID:</span>
              <span className="student-id-value">{studentId}</span>
            </div>
          </div>
        </header>

        <main className="class-content">
          {error && <div className="error-banner">{error}</div>}

          <section className="classes-section">
            <div className="section-header">
              <h2>Classes &amp; Shifts</h2>
              <p className="section-subtitle">Select a class and shift to begin the admission application.</p>
            </div>

            {loading ? (
              <div className="loading">Loading classes&hellip;</div>
            ) : classes.length === 0 ? (
              <div className="empty">No classes available.</div>
            ) : (
              <div className="classes-table-wrapper">
                <table className="classes-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Shift</th>
                      <th>Total Seats</th>
                      <th>Held Seats</th>
                      <th>Confirmed Seats</th>
                      <th>Available Seats</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => {
                      const hasActiveHold = activeHoldClassIds.has(cls.id);
                      const isFull = cls.available_seats <= 0;
                      return (
                        <tr key={cls.id} className={isFull ? 'row-full' : ''}>
                          <td className="cell-name">{cls.name}</td>
                          <td className="cell-shift"><span className="shift-badge">{cls.shift}</span></td>
                          <td className="cell-number">{cls.total_seats}</td>
                          <td className="cell-number">{cls.held_seats}</td>
                          <td className="cell-number">{cls.confirmed_seats}</td>
                          <td className={`cell-available ${isFull ? 'available-full' : 'available-ok'}`}>
                            {cls.available_seats}
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
                                {applyingClassId === cls.id ? 'Applying&hellip;' : 'Apply Now'}
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

          <section className="holds-section">
            <div className="section-header">
              <h2>My Applications</h2>
              <p className="section-subtitle">Your active seat holds and applications.</p>
            </div>
            {holds.length === 0 ? (
              <div className="empty">No active applications.</div>
            ) : (
              <div className="holds-list">
                {holds.map((hold) => {
                  const holdStatus = hold.status || 'Unknown';
                  const paymentStatus = hold.payment_status || 'Unpaid';
                  const admissionStatus = hold.admission_status || 'Pending';
                  const isPaid = paymentStatus === 'Paid';
                  const isPayableStatus = holdStatus === 'Held' || holdStatus === 'Confirmed';
                  const isPastExpiry = new Date(hold.expires_at).getTime() <= now;
                  const holdExpired =
                    !isPaid &&
                    (holdStatus === 'Expired' || (isPayableStatus && isPastExpiry));
                  const canPay = !isPaid && isPayableStatus && !holdExpired;

                  return (
                    <div key={hold.id} className="hold-card">
                      <div className="hold-info">
                        <p><strong>Class:</strong> {hold.class_name || hold.class_id}</p>
                        <p><strong>Quantity:</strong> {hold.quantity}</p>
                        <p><strong>Status:</strong> <span className={`status-${holdStatus.toLowerCase()}`}>{holdStatus.toUpperCase()}</span></p>
                        {holdStatus === 'Held' && (
                          <p><strong>Time Remaining:</strong> <HoldCountdown expiresAt={hold.expires_at} onExpire={handleHoldExpired} /></p>
                        )}
                        <p><strong>Payment:</strong> <span className={`payment-${paymentStatus.toLowerCase()}`}>{paymentStatus.toUpperCase()}</span></p>
                        <p><strong>Admission:</strong> <span className={`admission-${admissionStatus.toLowerCase()}`}>{admissionStatus.toUpperCase()}</span></p>
                        <p><strong>Held At:</strong> {new Date(hold.held_at).toLocaleString()}</p>
                        <p><strong>Expires At:</strong> {new Date(hold.expires_at).toLocaleString()}</p>
                        {hold.confirmed_at && <p><strong>Confirmed At:</strong> {new Date(hold.confirmed_at).toLocaleString()}</p>}
                        {hold.paid_at && <p><strong>Paid At:</strong> {new Date(hold.paid_at).toLocaleString()}</p>}
                        {hold.cancelled_at && <p><strong>Cancelled At:</strong> {new Date(hold.cancelled_at).toLocaleString()}</p>}
                      </div>
                      <div className="hold-actions">
                        {holdStatus === 'Held' && (
                          <>
                            <button onClick={() => handleConfirm(hold.id)} className="confirm-btn">Confirm</button>
                            <button onClick={() => handleRelease(hold.id)} className="release-btn">Release</button>
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
                        {holdStatus === 'Confirmed' && (
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
