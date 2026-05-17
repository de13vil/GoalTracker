import { authHeaders } from './auth';

export async function fetchSummaryReport() {
  const res = await fetch('http://localhost:5000/api/reports/summary', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load report');
  }

  return res.json();
}

export async function fetchCompletionReport() {
  const res = await fetch('http://localhost:5000/api/reports/completion', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load completion report');
  }

  return res.json();
}

export async function fetchAnalyticsReport() {
  const res = await fetch('http://localhost:5000/api/reports/analytics', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to load analytics report');
  }

  return res.json();
}

export async function downloadGoalsCsv() {
  const res = await fetch('http://localhost:5000/api/reports/export/csv', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to export report');
  }

  const blob = await res.blob();
  return blob;
}

export async function downloadAchievementCsv() {
  const res = await fetch('http://localhost:5000/api/reports/export/achievement-csv', {
    headers: authHeaders(),
    credentials: 'omit',
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Failed to export achievement report');
  }

  const blob = await res.blob();
  return blob;
}
