const { query } = require('../config/db');

const OfficerModel = {
  async getAll() {
    return await query(`
      SELECT o.id as officer_id, o.employee_id, o.active_status, o.user_id, o.department_id,
             u.name as officer_name, u.email as officer_email, u.phone as officer_phone,
             d.name as department_name,
             COUNT(c.id) as assigned_complaints,
             SUM(CASE WHEN c.status = 'In Progress' THEN 1 ELSE 0 END) as active_workload,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM officers o
      JOIN users u ON o.user_id = u.id
      JOIN departments d ON o.department_id = d.id
      LEFT JOIN complaints c ON o.id = c.officer_id
      GROUP BY o.id
      ORDER BY o.id ASC
    `);
  },

  async getByDepartment(departmentId) {
    return await query(`
      SELECT o.id as officer_id, o.employee_id, u.name as officer_name, u.email as officer_email,
             COUNT(c.id) as total_assigned,
             SUM(CASE WHEN c.status != 'Resolved' AND c.status != 'Rejected' THEN 1 ELSE 0 END) as current_active_workload
      FROM officers o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN complaints c ON o.id = c.officer_id
      WHERE o.department_id = ? AND o.active_status = 1
      GROUP BY o.id
      ORDER BY current_active_workload ASC
    `, [departmentId]);
  },

  async findByUserId(userId) {
    const rows = await query(`
      SELECT o.id as officer_id, o.user_id, o.department_id, o.employee_id, o.active_status,
             u.name as officer_name, u.email as officer_email, d.name as department_name
      FROM officers o
      JOIN users u ON o.user_id = u.id
      JOIN departments d ON o.department_id = d.id
      WHERE o.user_id = ?
    `, [userId]);
    return rows[0] || null;
  },

  async create({ user_id, department_id, employee_id }) {
    const result = await query(
      'INSERT INTO officers (user_id, department_id, employee_id, active_status) VALUES (?, ?, ?, 1)',
      [user_id, department_id, employee_id]
    );
    return result.insertId;
  },

  async toggleStatus(id, activeStatus) {
    await query('UPDATE officers SET active_status = ? WHERE id = ?', [activeStatus ? 1 : 0, id]);
    return true;
  }
};

module.exports = OfficerModel;
