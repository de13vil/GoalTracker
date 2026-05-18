import Notification from '../models/Notification.js';

export async function notifyUser(recipientId, payload) {
  if (!recipientId) return null;

  return Notification.create({
    recipientId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link || '',
    metadata: payload.metadata || {},
  });
}

export async function notifyUsers(recipientIds, payload) {
  const ids = [...new Set((recipientIds || []).filter(Boolean).map(String))];
  if (ids.length === 0) return [];

  return Notification.insertMany(
    ids.map((recipientId) => ({
      recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || '',
      metadata: payload.metadata || {},
    }))
  );
}