import { authHeaders } from './auth';

export async function fetchGoals() {
  const res = await fetch('http://localhost:5000/api/goals', {
    headers: authHeaders(),
    credentials: 'omit',
  });
  if (!res.ok) {
    throw new Error('Failed to load goals');
  }
  return res.json();
}

export async function createGoal(goalData) {
  const res = await fetch('http://localhost:5000/api/goals', {
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
  const res = await fetch(`http://localhost:5000/api/goals/${goalId}/status`, {
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
  const res = await fetch(`http://localhost:5000/api/goals/${goalId}`, {
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
  const res = await fetch('http://localhost:5000/api/goals/shared', {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to create shared goals');
  }

  return res.json();
}

export async function unlockGoal(goalId, comment = '') {
  const res = await fetch(`http://localhost:5000/api/goals/${goalId}/unlock`, {
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
  const res = await fetch(`http://localhost:5000/api/goals/${goalId}/audit`, {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load audit logs');
  }

  return res.json();
}
