import { useState, useEffect } from 'react';
import { api, getStudentId, clearStudentId } from '../api';

export default function ClassListing({ onSignOut }) {
  const [classes, setClasses] = useState([]);
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [holdClassId, setHoldClassId] = useState(null);
  const [holdQuantity, setHoldQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClasses();
    loadHolds();
  }, []);

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

  const handleHold = async (e) => {
    e.preventDefault();
    if (!holdClassId) return;
    setSubmitting(true);
    setError('');
    try {
      await api.createHold(holdClassId, holdQuantity);
      setHoldClassId(null);
      setHoldQuantity(1);
      await loadClasses();
      await loadHolds();
    } catch (err) {
      setError(err.message || 'Failed to place seat hold.');
    } finally {
      setSubmitting(false);
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

  const studentId = getStudentId();

  return (
    <div className="class-page">
      <header className="class-header">
        <div className="header-content">
          <div className="brand">
            <svg viewBox="0 0 32 32" aria-label="School logo">
              <circle cx="16" cy="10" r="6" fill="none" stroke="#ffffff" strokeWidth="2" />
              <path d="M10 20 Q16 12 22 20" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>SCHOOL ADMISSION</span>
          </div>
          <div className="student-info">
            <span className="student-id-label">Student ID:</span>
            <span className="student-id-value">{studentId}</span>
            <button onClick={() => { clearStudentId(); onSignOut(); }} className="signout-btn">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="class-main">
        {error && <div className="error-banner">{error}</div>}

        <section className="classes-section">
          <h2>Available Classes</h2>
          {loading ? (
            <div className="loading">Loading classes...</div>
          ) : classes.length === 0 ? (
            <div className="empty">No classes available.</div>
          ) : (
            <div className="classes-grid">
              {classes.map((cls) => (
                <div key={cls.id} className="class-card">
                  <div className="class-info">
                    <h3>{cls.name}</h3>
                    <p>Total Seats: {cls.total_seats}</p>
                    <p>Available Seats: {cls.available_seats}</p>
                    <p>Created: {new Date(cls.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="class-actions">
                    {cls.available_seats > 0 ? (
                      <>
                        <label>Qty</label>
                        <select
                          value={holdQuantity}
                          onChange={(e) => setHoldQuantity(parseInt(e.target.value, 10))}
                          disabled={holdClassId !== null && holdClassId !== cls.id}
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoldClassId(cls.id);
                          }}
                          disabled={holdClassId !== null && holdClassId !== cls.id}
                          className="hold-btn"
                        >
                          {holdClassId === cls.id ? 'Hold Seats' : 'Select'}
                        </button>
                      </>
                    ) : (
                      <button disabled className="hold-btn full">Full</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="holds-section">
          <h2>My Seat Holds</h2>
          {holds.length === 0 ? (
            <div className="empty">No active seat holds.</div>
          ) : (
            <div className="holds-list">
              {holds.map((hold) => (
                <div key={hold.id} className="hold-card">
                  <div className="hold-info">
                    <p><strong>Class ID:</strong> {hold.class_id}</p>
                    <p><strong>Quantity:</strong> {hold.quantity}</p>
                    <p><strong>Status:</strong> {hold.status}</p>
                    <p><strong>Held At:</strong> {new Date(hold.held_at).toLocaleString()}</p>
                    <p><strong>Expires At:</strong> {new Date(hold.expires_at).toLocaleString()}</p>
                    {hold.confirmed_at && <p><strong>Confirmed At:</strong> {new Date(hold.confirmed_at).toLocaleString()}</p>}
                  </div>
                  <div className="hold-actions">
                    {hold.status === 'Held' && (
                      <>
                        <button onClick={() => handleConfirm(hold.id)} className="confirm-btn">Confirm</button>
                        <button onClick={() => handleRelease(hold.id)} className="release-btn">Release</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="class-footer">
        <p>&copy; 2026 School Admission System. All rights reserved.</p>
      </footer>
    </div>
  );
}
