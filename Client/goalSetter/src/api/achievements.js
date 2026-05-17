import { authHeaders } from './auth';

export async function fetchAchievements(goalId) {
  const query = goalId ? `?goalId=${goalId}` : '';
  const res = await fetch(`http://localhost:5000/api/achievements${query}`, {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load achievements');
  }

  return res.json();
}

export async function createAchievement(payload) {
  const res = await fetch('http://localhost:5000/api/achievements', {
    method: 'POST',
    credentials: 'omit',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to save achievement');
  }

  return res.json();
}
