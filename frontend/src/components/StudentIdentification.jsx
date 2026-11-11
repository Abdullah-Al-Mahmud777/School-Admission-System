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
      <header className="id-topbar">
        <div className="id-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3 L4 8 L12 13 L20 8 Z" fill="#ffffff" />
              <path d="M6 12.5 V17 C6 18.6 8.7 20 12 20 C15.3 20 18 18.6 18 17 V12.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-name">School Admission System</span>
            <span className="brand-tag">Government Primary School</span>
          </span>
        </div>
        <span className="id-security-pill">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 2.5 L16 5 V9.5 C16 13.5 13.4 16.6 10 17.5 C6.6 16.6 4 13.5 4 9.5 V5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M7.5 10 L9.3 11.8 L12.8 8.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Safe &bull; Simple &bull; Transparent
        </span>
      </header>

      <main className="id-main">
        <div className="id-card">
          <div className="id-visual">
            <div>
              <h2 className="id-visual-title">A brighter future starts with one number.</h2>
              <p className="id-visual-text" style={{ marginTop: '10px' }}>
                Identify your child with their 17-digit Birth Registration Number and complete
                the admission process in minutes — no account required.
              </p>
            </div>

            <div className="id-art">
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

            <ul className="id-checklist">
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M6 10.3 L8.8 13 L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                No account required
              </li>
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M6 10.3 L8.8 13 L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Quick &amp; easy process
              </li>
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M6 10.3 L8.8 13 L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Your information is secure
              </li>
            </ul>
          </div>

          <div className="id-form-panel">
            <h1 className="form-title">Student Identification</h1>
            <p className="form-subtitle">
              Enter your child&rsquo;s 17-digit Birth Registration Number to continue with the
              admission process.
            </p>

            <form onSubmit={handleSubmit} className="brn-form">
              <div className="input-group">
                <svg className="input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="2.5" y="4" width="15" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="6.5" cy="8.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M4 13 C4.6 11.6 5.6 11 6.5 11 C7.4 11 8.4 11.6 9 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M11.5 8.5 H16 M11.5 11.5 H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
                  aria-invalid={!!error}
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
                {submitting ? 'Verifying…' : (
                  <>
                    Continue to Admission <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <p className="id-form-footnote">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="4" y="8.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 8.5 V6.5 A3 3 0 0 1 13 6.5 V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Your data is encrypted and never shared.
            </p>
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
