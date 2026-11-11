const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const STUDENT_ID_KEY = 'school_admission_student_id';
const ADMIN_TOKEN_KEY = 'school_admission_admin_token';
const ADMIN_PROFILE_KEY = 'school_admission_admin_profile';
const ADMIN_UNAUTHORIZED_EVENT = 'school_admission_admin_unauthorized';

function getStudentId() {
  return localStorage.getItem(STUDENT_ID_KEY);
}

function setStudentId(studentId) {
  localStorage.setItem(STUDENT_ID_KEY, studentId);
}

function clearStudentId() {
  localStorage.removeItem(STUDENT_ID_KEY);
}

function isValidStudentId(studentId) {
  return /^\d{17}$/.test(studentId);
}

function readAdminValue(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function getAdminToken() {
  return readAdminValue(ADMIN_TOKEN_KEY);
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getSessionExpiry(token, profile) {
  const profileExpiry = profile.expires_at ? new Date(profile.expires_at).getTime() : NaN;
  if (Number.isFinite(profileExpiry)) return profileExpiry;

  const payload = decodeJwtPayload(token);
  return payload?.exp ? payload.exp * 1000 : NaN;
}

function getAdminSession() {
  const token = getAdminToken();
  const rawProfile = readAdminValue(ADMIN_PROFILE_KEY);
  if (!token || !rawProfile) return null;

  try {
    const profile = JSON.parse(rawProfile);
    const expiresAt = getSessionExpiry(token, profile);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      clearAdminSession();
      return null;
    }
    return { token, ...profile };
  } catch {
    clearAdminSession();
    return null;
  }
}

function saveAdminSession(auth, { remember = false } = {}) {
  clearAdminSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ADMIN_TOKEN_KEY, auth.token);
  storage.setItem(
    ADMIN_PROFILE_KEY,
    JSON.stringify({
      email: auth.email,
      full_name: auth.full_name,
      expires_at: auth.expires_at,
    }),
  );
  return getAdminSession();
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_PROFILE_KEY);
}

async function request(path, options = {}) {
  const studentId = getStudentId();
  const adminToken = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (studentId) {
    headers['X-Student-Id'] = studentId;
  }
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      (path.startsWith('/admin') || path === '/auth/me')
    ) {
      clearAdminSession();
      window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
    }

    const error = new Error(data?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  getClasses: () => request('/classes'),
  getClassById: (classId) => request(`/classes/${classId}`),
  createHold: (classId, quantity) =>
    request(`/classes/${classId}/holds`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),
  getHold: (holdId) => request(`/holds/${holdId}`),
  confirmHold: (holdId) => request(`/holds/${holdId}/confirm`, { method: 'POST' }),
  payHold: (holdId) => request(`/holds/${holdId}/pay`, { method: 'POST' }),
  cancelHold: (holdId) => request(`/holds/${holdId}/cancel`, { method: 'POST' }),
  releaseHold: (holdId) => request(`/holds/${holdId}`, { method: 'DELETE' }),
  getMyHolds: () => request('/me/holds'),

  adminLogin: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getAdminMe: () => request('/auth/me'),
  getAdminClasses: () => request('/admin/classes'),
  getAdminApplications: () => request('/admin/applications'),
  createClass: (payload) =>
    request('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateClass: (classId, payload) =>
    request(`/admin/classes/${classId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteClass: (classId) =>
    request(`/admin/classes/${classId}`, { method: 'DELETE' }),
};

export {
  getStudentId,
  setStudentId,
  clearStudentId,
  isValidStudentId,
  getAdminToken,
  getAdminSession,
  saveAdminSession,
  clearAdminSession,
  ADMIN_UNAUTHORIZED_EVENT,
};
