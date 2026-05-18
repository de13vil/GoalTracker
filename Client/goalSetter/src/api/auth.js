// API utility for authentication
const API_BASE = 'https://goaltracker-zt4y.onrender.com/api';
const TOKEN_KEY = 'goaltracker_tab_token';

export function setSessionToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getSessionToken() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(TOKEN_KEY) || '';
}

export function authHeaders(headers = {}) {
  const token = getSessionToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export async function loginUser({ username, password, role }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Login failed");
  }
  const data = await res.json();
  setSessionToken(data.token);
  return data;
}

export async function registerUser({ username, password, role, email, fullName, registrationKey, otp }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ username, password, role, email, fullName, registrationKey, otp }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Registration failed");
  }

  return res.json();
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
    credentials: "omit",
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.user || null;
}

export async function logoutUser() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
  });

  setSessionToken('');

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Logout failed");
  }

  return res.json();
}

export async function fetchUsers(role) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  const res = await fetch(`${API_BASE}/auth/users${query}`, {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load users');
  }

  return res.json();
}

export async function updateUserHierarchy(userId, payload) {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/hierarchy`, {
    method: 'PATCH',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update hierarchy');
  }

  return res.json();
}
