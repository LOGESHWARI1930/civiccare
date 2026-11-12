const { query } = require('../config/db');

const ComplaintModel = {
  /**
   * Generate unique complaint number format: GRV-2026-00001
   */
  async generateComplaintNumber() {
    const year = new Date().getFullYear();
    const rows = await query('SELECT COUNT(*) as count FROM complaints');
    const count = (rows[0].count || 0) + 1;
    const padded = String(count).padStart(5, '0');
    return `GRV-${year}-${padded}`;
  },

  async create({
    citizen_id,
    category,
    title,
    description,
    image_url,
    latitude,
    longitude,
    location_address,
    priority = 'Medium'
  }) {
    const complaint_number = await this.generateComplaintNumber();
    const result = await query(
      `INSERT INTO complaints (
        complaint_number, citizen_id, category, title, description,
        image_url, latitude, longitude, location_address, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        complaint_number,
        citizen_id,
        category,
        title,
        description,
        image_url || null,
        latitude || null,
        longitude || null,
        location_address,
        priority || 'Medium'
      ]
    );
    return { id: result.insertId, complaint_number };
  },

  async findById(id) {
    const sql = `
      SELECT c.*,
             u.name as citizen_name, u.email as citizen_email, u.phone as citizen_phone,
             d.name as department_name, d.description as department_description,
             off_user.name as officer_name, off.employee_id as officer_employee_id,
             res.description as resolution_description, res.evidence_image_url as resolution_evidence_url, res.resolved_at,
             fb.rating as feedback_rating, fb.resolution_status as feedback_status, fb.comment as feedback_comment, fb.created_at as feedback_created_at
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      LEFT JOIN resolutions res ON c.id = res.complaint_id
      LEFT JOIN feedback fb ON c.id = fb.complaint_id
      WHERE c.id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  },

  async findAll(filters = {}) {
    let sql = `
      SELECT c.*,
             u.name as citizen_name, u.email as citizen_email,
             d.name as department_name,
             off_user.name as officer_name
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.citizen_id) {
      sql += ` AND c.citizen_id = ?`;
      params.push(filters.citizen_id);
    }
    if (filters.department_id) {
      sql += ` AND c.department_id = ?`;
      params.push(filters.department_id);
    }
    if (filters.officer_id) {
      sql += ` AND c.officer_id = ?`;
      params.push(filters.officer_id);
    }
    if (filters.status) {
      sql += ` AND c.status = ?`;
      params.push(filters.status);
    }
    if (filters.category) {
      sql += ` AND c.category = ?`;
      params.push(filters.category);
    }
    if (filters.priority) {
      sql += ` AND c.priority = ?`;
      params.push(filters.priority);
    }
    if (filters.search) {
      sql += ` AND (c.complaint_number LIKE ? OR c.title LIKE ? OR c.location_address LIKE ? OR u.name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY c.created_at DESC`;

    return await query(sql, params);
  },

  async updateStatus(id, status) {
    await query('UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    return true;
  },

  async assignDepartmentAndOfficer(id, { department_id, officer_id, priority, status }) {
    let updateFields = ['department_id = ?', 'updated_at = NOW()'];
    let params = [department_id];

    if (officer_id !== undefined) {
      updateFields.push('officer_id = ?');
      params.push(officer_id || null);
    }
    if (priority) {
      updateFields.push('priority = ?');
      params.push(priority);
    }
    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }

    params.push(id);
    const sql = `UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, params);
    return true;
  },

  async getDashboardStats() {
    const stats = await query(`
      SELECT
        COUNT(*) as total_complaints,
        SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN status = 'Under Review' THEN 1 ELSE 0 END) as under_review_count,
        SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) as assigned_count,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical_count
      FROM complaints
    `);

    const categoryStats = await query(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
    `);

    const priorityStats = await query(`
      SELECT priority, COUNT(*) as count
      FROM complaints
      GROUP BY priority
    `);

    return {
      overview: stats[0],
      byCategory: categoryStats,
      byPriority: priorityStats
    };
  }
};

module.exports = ComplaintModel;
