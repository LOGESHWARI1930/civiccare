const { query } = require('../config/db');

const ResolutionModel = {
  async create({ complaint_id, officer_id, description, evidence_image_url }) {
    const result = await query(
      `INSERT INTO resolutions (complaint_id, officer_id, description, evidence_image_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), evidence_image_url = VALUES(evidence_image_url), resolved_at = NOW()`,
      [complaint_id, officer_id, description, evidence_image_url || null]
    );
    return result.insertId;
  },

  async getByComplaintId(complaint_id) {
    const rows = await query(`
      SELECT r.*, u.name as officer_name, off.employee_id
      FROM resolutions r
      JOIN officers off ON r.officer_id = off.id
      JOIN users u ON off.user_id = u.id
      WHERE r.complaint_id = ?
    `, [complaint_id]);
    return rows[0] || null;
  }
};

module.exports = ResolutionModel;
