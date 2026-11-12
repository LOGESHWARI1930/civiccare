const { query } = require('../config/db');

const NotificationModel = {
  async create({ user_id, complaint_id, message }) {
    const result = await query(
      `INSERT INTO notifications (user_id, complaint_id, message, is_read) VALUES (?, ?, ?, 0)`,
      [user_id, complaint_id || null, message]
    );
    return result.insertId;
  },

  async getByUserId(user_id) {
    return await query(`
      SELECT n.*, c.complaint_number
      FROM notifications n
      LEFT JOIN complaints c ON n.complaint_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 20
    `, [user_id]);
  },

  async markAsRead(id, user_id) {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, user_id]);
    return true;
  },

  async markAllAsRead(user_id) {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user_id]);
    return true;
  }
};

module.exports = NotificationModel;
