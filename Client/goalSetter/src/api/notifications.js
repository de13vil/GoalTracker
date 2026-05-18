import { authHeaders } from './auth';

export async function fetchNotifications() {
  const res = await fetch('https://goaltracker-zt4y.onrender.com/api/notifications', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load notifications');
  }

  return res.json();
}

export async function markNotificationRead(notificationId) {
  const res = await fetch(`https://goaltracker-zt4y.onrender.com/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to update notification');
  }

  return res.json();
}