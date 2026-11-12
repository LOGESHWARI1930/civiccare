const { query } = require('../config/db');

const FeedbackModel = {
  async create({ complaint_id, citizen_id, rating, resolution_status = 'Satisfied', comment }) {
    const result = await query(
      `INSERT INTO feedback (complaint_id, citizen_id, rating, resolution_status, comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), resolution_status = VALUES(resolution_status), comment = VALUES(comment)`,
      [complaint_id, citizen_id, rating, resolution_status, comment]
    );
    return result.insertId;
  },

  async getByComplaintId(complaint_id) {
    const rows = await query(`
      SELECT f.*, u.name as citizen_name
      FROM feedback f
      JOIN users u ON f.citizen_id = u.id
      WHERE f.complaint_id = ?
    `, [complaint_id]);
    return rows[0] || null;
  },

  async getAverageRating() {
    const rows = await query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedback
      FROM feedback
    `);
    return rows[0] || { avg_rating: 0, total_feedback: 0 };
  }
};

module.exports = FeedbackModel;
