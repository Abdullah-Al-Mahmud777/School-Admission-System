import { useRef, useState } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_ADMIN = {
  email: import.meta.env.VITE_ADMIN_EMAIL || 'admin@school.edu',
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@12345',
};

function validate(values) {
  const errors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setNotice('');

    if (touched[name]) {
      const nextErrors = validate(nextForm);
      setErrors((prev) => ({ ...prev, [name]: nextErrors[name], form: undefined }));
    } else if (errors.form) {
      setErrors((prev) => ({ ...prev, form: undefined }));
    }
  };

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const nextErrors = validate(form);
    setErrors((prev) => ({ ...prev, [name]: nextErrors[name] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setNotice('');

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    setSubmitting(true);
    try {
      if (onLogin) {
        await onLogin({
          email: form.email.trim(),
          password: form.password,
          remember,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setNotice('Preview mode: connect the admin authentication service to enable sign in.');
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err?.message || 'Unable to sign in. Please try again.',
      }));
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const emailError = touched.email ? errors.email : '';
  const passwordError = touched.password ? errors.password : '';

  return (
    <div className="id-page admin-page">
      <header className="id-topbar">
        <div className="id-brand">
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
            <span className="brand-name">School Admission System</span>
            <span className="brand-tag">Government Primary School</span>
          </span>
        </div>
        <span className="id-security-pill">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 2.5 L16 5 V9.5 C16 13.5 13.4 16.6 10 17.5 C6.6 16.6 4 13.5 4 9.5 V5 Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M7.5 10 L9.3 11.8 L12.8 8.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Restricted &bull; Admin Access
        </span>
      </header>

      <main className="id-main">
        <div className="id-card admin-card">
          <div className="id-visual admin-visual">
            <span className="admin-visual-badge">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2.5 L16 5 V9.5 C16 13.5 13.4 16.6 10 17.5 C6.6 16.6 4 13.5 4 9.5 V5 Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.5 10 L9.3 11.8 L12.8 8.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Administrator Portal
            </span>

            <div className="admin-visual-copy">
              <h2 className="id-visual-title">Manage admissions with confidence.</h2>
              <p className="id-visual-text">
                Review applications, monitor seat availability, and keep every admission decision
                organised from one secure workspace.
              </p>
            </div>

            <div className="admin-art">
              <svg viewBox="0 0 240 200" className="admin-art-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="adminShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <circle cx="120" cy="98" r="78" fill="rgba(96, 165, 250, 0.16)" />
                <circle cx="120" cy="98" r="58" fill="rgba(255, 255, 255, 0.07)" />
                <path
                  d="M120 40 L170 59 V101 C170 135 148 162 120 173 C92 162 70 135 70 101 V59 Z"
                  fill="url(#adminShieldGrad)"
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeWidth="2"
                />
                <rect x="99" y="101" width="42" height="32" rx="7" fill="#ffffff" />
                <path
                  d="M108 101 V93 C108 86.4 113.4 81 120 81 C126.6 81 132 86.4 132 93 V101"
                  stroke="#ffffff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="120" cy="115" r="4" fill="#2563eb" />
                <path
                  d="M120 119 V126"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="52" cy="58" r="3" fill="rgba(255, 255, 255, 0.45)" />
                <circle cx="190" cy="142" r="4" fill="rgba(255, 255, 255, 0.35)" />
                <circle cx="188" cy="48" r="2.5" fill="rgba(255, 255, 255, 0.4)" />
              </svg>
            </div>

            <ul className="id-checklist">
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M6 10.3 L8.8 13 L14 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Secure staff authentication
              </li>
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M6 10.3 L8.8 13 L14 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Real-time admissions oversight
              </li>
              <li className="id-check-item">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M6 10.3 L8.8 13 L14 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Audit-ready activity history
              </li>
            </ul>
          </div>

          <div className="id-form-panel admin-form-panel">
            <span className="admin-eyebrow">Staff sign in</span>
            <h1 className="form-title">Admin Login</h1>
            <p className="form-subtitle">
              Enter your administrator credentials to access the admissions workspace.
            </p>

            <div className="admin-demo-box" aria-label="Default administrator credentials">
              <span className="admin-demo-heading">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect
                    x="4.5"
                    y="8.5"
                    width="11"
                    height="8"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7.5 8.5 V6.5 A2.5 2.5 0 0 1 12.5 6.5 V8.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Default admin credentials
              </span>
              <div className="admin-demo-values">
                <div className="admin-demo-item">
                  <span className="admin-demo-key">Email</span>
                  <span className="admin-demo-value">{DEFAULT_ADMIN.email}</span>
                </div>
                <div className="admin-demo-item">
                  <span className="admin-demo-key">Password</span>
                  <span className="admin-demo-value">{DEFAULT_ADMIN.password}</span>
                </div>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleSubmit} noValidate>
              <div className="admin-field">
                <label htmlFor="admin-email" className="admin-label">
                  Email address
                </label>
                <div className={`admin-input-wrap ${emailError ? 'has-error' : ''}`}>
                  <svg className="admin-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect
                      x="2.5"
                      y="4.5"
                      width="15"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3.5 6 L10 10.5 L16.5 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <input
                    ref={emailRef}
                    id="admin-email"
                    name="email"
                    type="email"
                    className="admin-input"
                    placeholder="admin@school.edu"
                    autoComplete="username"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'admin-email-error' : undefined}
                  />
                </div>
                {emailError && (
                  <p className="error-msg" id="admin-email-error">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="admin-field">
                <div className="admin-label-row">
                  <label htmlFor="admin-password" className="admin-label">
                    Password
                  </label>
                  <button
                    type="button"
                    className="admin-link-btn"
                    onClick={(event) => event.preventDefault()}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className={`admin-input-wrap ${passwordError ? 'has-error' : ''}`}>
                  <svg className="admin-input-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect
                      x="4.5"
                      y="8.5"
                      width="11"
                      height="8"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M7.5 8.5 V6.5 A2.5 2.5 0 0 1 12.5 6.5 V8.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    ref={passwordRef}
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="admin-input admin-input-password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? 'admin-password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M3 3 L17 17"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M8.2 5.8 A7.6 7.6 0 0 1 10 5.5 C14.7 5.5 17.5 10 17.5 10 A13.4 13.4 0 0 1 15.3 12.6 M11.9 14.3 A7.4 7.4 0 0 1 10 14.5 C5.3 14.5 2.5 10 2.5 10 A13.5 13.5 0 0 1 5.8 6.8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.5 8.7 A2 2 0 0 0 11.3 11.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M2.5 10 C2.5 10 5.3 5.5 10 5.5 C14.7 5.5 17.5 10 17.5 10 C17.5 10 14.7 14.5 10 14.5 C5.3 14.5 2.5 10 2.5 10 Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="error-msg" id="admin-password-error">
                    {passwordError}
                  </p>
                )}
              </div>

              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  disabled={submitting}
                />
                <span>Keep me signed in on this device</span>
              </label>

              {errors.form && (
                <div className="error-banner" role="alert">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M10 6 V10.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="10" cy="13.5" r="0.9" fill="currentColor" />
                  </svg>
                  {errors.form}
                </div>
              )}

              {notice && (
                <p className="admin-notice" role="status">
                  {notice}
                </p>
              )}

              <button type="submit" className="continue-btn admin-submit" disabled={submitting}>
                {submitting ? (
                  'Signing in…'
                ) : (
                  <>
                    Sign in securely <span className="arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <p className="id-form-footnote admin-footnote">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2.5 L16 5 V9.5 C16 13.5 13.4 16.6 10 17.5 C6.6 16.6 4 13.5 4 9.5 V5 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.5 10 L9.3 11.8 L12.8 8.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Authorized school staff only. Activity is monitored.
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
