const storedBase = localStorage.getItem('scl_api_base');
const runtimeBase = typeof window !== 'undefined' ? window.SCL_API_BASE : '';
const API_BASE = (runtimeBase || storedBase || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

export function setApiBase(base) {
  if (!base) return;
  localStorage.setItem('scl_api_base', base.replace(/\/$/, ''));
}

export function upsertLearner(payload) {
  return apiFetch('/api/learners', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function upsertEnrollment(payload) {
  return apiFetch('/api/enrollments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateEnrollment(enrollmentId, payload) {
  return apiFetch(`/api/enrollments/${enrollmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function issueCertificate(payload) {
  return apiFetch('/api/certificates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function listCourses() {
  return apiFetch('/api/courses');
}
