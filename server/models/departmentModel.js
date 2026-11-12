const { query } = require('../config/db');

const DepartmentModel = {
  async getAll() {
    return await query(`
      SELECT d.*, 
             COUNT(DISTINCT o.id) as officer_count,
             COUNT(DISTINCT c.id) as total_complaints,
             SUM(CASE WHEN c.status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress') THEN 1 ELSE 0 END) as active_complaints,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_complaints
      FROM departments d
      LEFT JOIN officers o ON d.id = o.department_id
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id
      ORDER BY d.id ASC
    `);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM departments WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, description }) {
    const result = await query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.insertId;
  },

  async update(id, { name, description }) {
    await query(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    return true;
  },

  async delete(id) {
    await query('DELETE FROM departments WHERE id = ?', [id]);
    return true;
  }
};

module.exports = DepartmentModel;
