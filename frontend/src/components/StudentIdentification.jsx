import { useState } from 'react';
import { setStudentId, isValidStudentId } from '../api';

const DEMO_BRN = '20152691234567890';

export default function StudentIdentification({ onIdentified }) {
  const [brn, setBrn] = useState(DEMO_BRN);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setBrn(value);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidStudentId(brn)) {
      setError('Birth Registration Number must contain exactly 17 digits.');
      return;
    }
    setSubmitting(true);
    setStudentId(brn);
    setTimeout(() => {
      setSubmitting(false);
      onIdentified(brn);
    }, 300);
  };

  const digitCount = brn.replace(/\D/g, '').length;
  const isValid = digitCount === 17;

  return (
    <div className="id-page">
      <header className="app-header">
        <div className="header-content">
          <div className="brand">
            <svg className="logo-icon" viewBox="0 0 32 32" aria-label="School logo">
              <path d="M16 2 L8 10 L16 18 L24 10 Z" fill="#2563eb" />
              <path d="M6 20 H26 V30 H6 Z" fill="#2563eb" />
              <rect x="12" y="22" width="8" height="4" fill="#fbbf24" rx="2" />
              <path d="M10 24 Q16 20 22 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="brand-text">
              <div className="brand-title">School Admission System</div>
              <div className="brand-subtitle">Government Primary School</div>
            </div>
          </div>
          <div className="header-badge">
            <svg className="badge-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 2 L5 8 L10 14 L15 8 Z" fill="#10b981" />
              <circle cx="10" cy="10" r="2" fill="#ffffff" />
            </svg>
            <span>Safe &bull; Simple &bull; Transparent</span>
          </div>
        </div>
      </header>

      <main className="id-main">
        <div className="id-card">
          <div className="card-left">
            <div className="illustration">
              <svg viewBox="0 0 240 240" className="illustration-svg" aria-label="Parent and child illustration">
                <defs>
                  <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#fce7f3', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#fbcfe8', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#1f2937', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#111827', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                {/* Parent */}
                <path d="M60 140 Q50 120 55 100 Q60 80 70 100 Q75 120 65 140 Z" fill="url(#skinGrad)" />
                <path d="M50 100 Q45 80 55 70 Q65 60 80 70 Q90 80 85 100 Z" fill="url(#hairGrad)" />
                <circle cx="62" cy="88" r="4" fill="#1f2937" />
                <circle cx="78" cy="88" r="4" fill="#1f2937" />
                <path d="M65 95 Q70 100 75 95" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                <path d="M45 140 Q40 160 50 170 Q60 180 70 170 Q80 160 75 140 Z" fill="#3b82f6" />
                <path d="M55 130 L55 150 L65 160 L65 130 Z" fill="#fbbf24" />
                <circle cx="50" cy="155" r="12" fill="#dbeafe" />
                <rect x="44" y="145" width="12" height="10" fill="#fce7f3" rx="2" />
                {/* Child */}
                <path d="M130 140 Q120 120 125 100 Q130 80 135 100 Q140 120 135 140 Z" fill="url(#skinGrad)" />
                <path d="M120 100 Q115 80 125 70 Q135 60 150 70 Q155 80 160 100 Z" fill="url(#hairGrad)" />
                <circle cx="128" cy="88" r="3" fill="#1f2937" />
                <circle cx="142" cy="88" r="3" fill="#1f2937" />
                <path d="M133 95 Q138 100 143 95" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
                <path d="M115 140 Q110 160 120 170 Q130 180 140 170 Q150 160 145 140 Z" fill="#3b82f6" />
                <circle cx="115" cy="165" r="10" fill="#dbeafe" />
                <rect x="109" y="150" width="10" height="10" fill="#fce7f3" rx="2" />
                {/* Clipboard */}
                <circle cx="160" cy="85" r="28" fill="#dbeafe" />
                <rect x="148" y="88" width="24" height="34" fill="#ffffff" stroke="#2563eb" strokeWidth="2" rx="4" />
                <rect x="154" y="96" width="12" height="4" fill="#2563eb" rx="2" />
                <rect x="154" y="104" width="10" height="3" fill="#2563eb" rx="1" />
                <rect x="154" y="111" width="8" height="3" fill="#2563eb" rx="1" />
                <rect x="159" y="118" width="6" height="4" fill="#10b981" rx="2" />
                <path d="M162 124 L166 128 L170 122" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="card-right">
            <h1 className="form-title">Student Identification</h1>
            <p className="form-subtitle">Enter your child&rsquo;s 17-digit Birth Registration Number to continue with the admission process.</p>

            <form onSubmit={handleSubmit} className="brn-form">
              <div className="input-group">
                <svg className="input-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 4 V16 H17 V4 Z" fill="none" stroke="#64748b" strokeWidth="1.5" rx="1" />
                  <circle cx="6" cy="7" r="2" fill="#64748b" />
                  <path d="M6 9 V12" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  id="brn"
                  type="text"
                  maxLength="17"
                  value={brn}
                  onChange={handleChange}
                  placeholder="Enter 17-digit Birth Registration Number"
                  disabled={submitting}
                  className={`brn-input ${error ? 'error' : ''} ${isValid ? 'valid' : ''}`}
                  aria-label="17-digit Birth Registration Number"
                />
              </div>
              <div className="counter-row">
                <span className="counter-hint">Only 17 digits are accepted</span>
                <span className="counter-value">{digitCount} / 17</span>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="continue-btn"
              >
                {submitting ? 'Verifying...' : (
                  <>
                    Continue to Admission <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="features">
              <div className="feature">
                <svg className="feature-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2 L3 8 L10 14 L17 8 Z" fill="#2563eb" />
                  <path d="M10 14 L10 20 M3 8 H17 M8 14 L10 12 L12 14" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <div>
                  <div className="feature-title">No account required</div>
                </div>
              </div>
              <div className="feature">
                <svg className="feature-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M4 4 H16 V16 H4 Z" fill="none" stroke="#2563eb" strokeWidth="2" rx="1" />
                  <path d="M8 8 L12 12 M12 8 L8 12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div>
                  <div className="feature-title">Quick &amp; Easy Process</div>
                </div>
              </div>
              <div className="feature">
                <svg className="feature-icon" viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="3" y="4" width="14" height="12" fill="none" stroke="#2563eb" strokeWidth="2" rx="2" />
                  <path d="M10 6 L10 10 L14 14" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                <div>
                  <div className="feature-title">Your Information is Secure</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-divider"></div>
        <p className="footer-text">A Brighter Future for Every Child</p>
        <div className="footer-divider"></div>
      </footer>
    </div>
  );
}
