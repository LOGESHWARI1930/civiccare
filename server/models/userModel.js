const { query } = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(
      'SELECT id, name, email, phone, role, address, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, phone, password, role = 'citizen', address = '' }) {
    const result = await query(
      'INSERT INTO users (name, email, phone, password, role, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone, password, role, address]
    );
    return result.insertId;
  },

  async getAllUsers() {
    return await query(
      'SELECT id, name, email, phone, role, address, created_at FROM users ORDER BY created_at DESC'
    );
  },

  async updateRole(id, role) {
    await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return true;
  },

  async updateProfile(id, { name, phone, address }) {
    await query(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?',
      [name, phone || '', address || '', id]
    );
    return true;
  },

  async updatePassword(id, hashedPassword) {
    await query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return true;
  }
};

module.exports = UserModel;
