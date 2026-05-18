import { authHeaders } from './auth';

export async function fetchCycleSettings() {
  const res = await fetch('https://goaltracker-zt4y.onrender.com/api/cycles', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load cycle settings');
  }

  return res.json();
}

export async function updateCycleSettings(payload) {
  const res = await fetch('https://goaltracker-zt4y.onrender.com/api/cycles', {
    method: 'PUT',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update cycle settings');
  }

  return res.json();
}
