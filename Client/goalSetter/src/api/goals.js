import { authHeaders } from './auth';

const API_HOST = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? `http://localhost:${window.__GOALTRACKER_API_PORT__ || 5001}`
  : 'https://goaltracker-zt4y.onrender.com';
const API_BASE = `${API_HOST}/api`;

export async function fetchGoals() {
  const res = await fetch(`${API_BASE}/goals`, {
    headers: authHeaders(),
    credentials: 'omit',
  });
  if (!res.ok) {
    throw new Error('Failed to load goals');
  }
  return res.json();
}

export async function createGoal(goalData) {
  const res = await fetch(`${API_BASE}/goals`, {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(goalData),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to create goal');
  }

  return res.json();
}

export async function updateGoalStatus(goalId, status, comment = '', payload = {}) {
  const res = await fetch(`${API_BASE}/goals/${goalId}/status`, {
    method: 'PATCH',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, comment, ...payload }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update goal status');
  }

  return res.json();
}

export async function editGoal(goalId, payload) {
  const res = await fetch(`${API_BASE}/goals/${goalId}`, {
    method: 'PATCH',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update goal');
  }

  return res.json();
}

export async function createSharedGoals(payload) {
  const res = await fetch(`${API_BASE}/goals/shared`, {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = 'Failed to create shared goals';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // Keep default message when server returns non-JSON body.
    }
    throw new Error(message);
  }

  return res.json();
}

export async function unlockGoal(goalId, comment = '') {
  const res = await fetch(`${API_BASE}/goals/${goalId}/unlock`, {
    method: 'PATCH',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to unlock goal');
  }

  return res.json();
}

export async function fetchGoalAudit(goalId) {
  const res = await fetch(`${API_BASE}/goals/${goalId}/audit`, {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load audit logs');
  }

  return res.json();
}

export async function createObjection(goalId, payload) {
  const res = await fetch(`${API_BASE}/goals/${goalId}/objection`, {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to file objection');
  }

  return res.json();
}
