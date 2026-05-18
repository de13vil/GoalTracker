import Notification from '../models/Notification.js';

const normalizeNotification = (item) => ({
  id: item._id,
  type: item.type,
  title: item.title,
  message: item.message,
  link: item.link,
  metadata: item.metadata || {},
  readAt: item.readAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    return res.json({ notifications: notifications.map(normalizeNotification) });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Server error while loading notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user.id },
      { readAt: new Date() },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ message: 'Notification marked as read', notification: normalizeNotification(notification) });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Server error while updating notification' });
  }
};