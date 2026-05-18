import { authHeaders } from './auth';

export async function fetchCheckIns(goalId) {
  const query = goalId ? `?goalId=${goalId}` : '';
  const res = await fetch(`https://goaltracker-zt4y.onrender.com/api/checkins${query}`, {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load check-ins');
  }

  return res.json();
}

export async function createCheckIn(payload) {
  const res = await fetch('https://goaltracker-zt4y.onrender.com/api/checkins', {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to save check-in');
  }

  return res.json();
}

export async function reviewCheckIn(checkInId, comment) {
  const res = await fetch(`https://goaltracker-zt4y.onrender.com/api/checkins/${checkInId}/review`, {
    method: 'PATCH',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to review check-in');
  }

  return res.json();
}
