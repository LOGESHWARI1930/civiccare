const { query } = require('../config/db');

const StatusHistoryModel = {
  async addHistory({ complaint_id, status, comment, changed_by }) {
    const result = await query(
      `INSERT INTO complaint_status_history (complaint_id, status, comment, changed_by) VALUES (?, ?, ?, ?)`,
      [complaint_id, status, comment, changed_by]
    );
    return result.insertId;
  },

  async getByComplaintId(complaint_id) {
    return await query(`
      SELECT sh.*, u.name as changed_by_name, u.role as changed_by_role
      FROM complaint_status_history sh
      JOIN users u ON sh.changed_by = u.id
      WHERE sh.complaint_id = ?
      ORDER BY sh.created_at ASC
    `, [complaint_id]);
  }
};

module.exports = StatusHistoryModel;
