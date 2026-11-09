const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const STUDENT_ID_KEY = 'school_admission_student_id';

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

async function request(path, options = {}) {
  const studentId = getStudentId();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (studentId) {
    headers['X-Student-Id'] = studentId;
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
  releaseHold: (holdId) => request(`/holds/${holdId}`, { method: 'DELETE' }),
  getMyHolds: () => request('/me/holds'),
};

export { getStudentId, setStudentId, clearStudentId, isValidStudentId };
