const NotificationModel = require('../models/notificationModel');

/**
 * Get notifications for current authenticated user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const notifications = await NotificationModel.getByUserId(req.user.id);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications.'
    });
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await NotificationModel.markAsRead(id, req.user.id);
    res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    console.error('Mark As Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification.'
    });
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    await NotificationModel.markAllAsRead(req.user.id);
    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications.'
    });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
