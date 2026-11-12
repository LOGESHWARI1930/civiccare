const { query } = require('../config/db');

/**
 * Get Citizen Dashboard summary statistics, latest 5 complaints, and recent activity feed
 * GET /api/citizen/dashboard
 */
async function getCitizenDashboard(req, res) {
  try {
    const citizenId = req.user.id;

    // 1. Calculate dynamic statistics scoped to logged-in citizen
    const statsRows = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review', 'Assigned') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
      FROM complaints
      WHERE citizen_id = ?
    `, [citizenId]);

    const stats = statsRows[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0, rejected: 0 };

    // 2. Fetch latest 5 complaints for citizen
    const recentComplaints = await query(`
      SELECT c.id, c.complaint_number, c.title, c.category, c.priority, c.status, c.created_at, c.updated_at, c.location_address,
             d.name as department_name
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.citizen_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [citizenId]);

    // 3. Fetch recent activity timeline feed for citizen's complaints
    const recentActivity = await query(`
      SELECT sh.id, sh.complaint_id, sh.status, sh.comment, sh.created_at,
             c.complaint_number, c.title as complaint_title,
             u.name as changed_by_name, u.role as changed_by_role
      FROM complaint_status_history sh
      JOIN complaints c ON sh.complaint_id = c.id
      JOIN users u ON sh.changed_by = u.id
      WHERE c.citizen_id = ?
      ORDER BY sh.created_at DESC
      LIMIT 5
    `, [citizenId]);

    res.json({
      success: true,
      stats,
      recentComplaints,
      recentActivity
    });
  } catch (error) {
    console.error('Citizen Dashboard Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch citizen dashboard data.'
    });
  }
}

/**
 * Get all complaints for logged-in citizen with filters, search, and pagination
 * GET /api/citizen/complaints
 */
async function getCitizenComplaints(req, res) {
  try {
    const citizenId = req.user.id;
    const { status, category, priority, search, page = 1, limit = 6, sort = 'newest' } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const offset = (pageNum - 1) * limitNum;

    let baseSql = `
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      WHERE c.citizen_id = ?
    `;
    const params = [citizenId];

    // Status Filter
    if (status && status !== 'All') {
      if (status === 'Pending') {
        baseSql += ` AND c.status IN ('Submitted', 'Under Review', 'Assigned')`;
      } else {
        baseSql += ` AND c.status = ?`;
        params.push(status);
      }
    }

    // Category Filter
    if (category && category !== 'All') {
      baseSql += ` AND c.category = ?`;
      params.push(category);
    }

    // Priority Filter
    if (priority && priority !== 'All') {
      baseSql += ` AND c.priority = ?`;
      params.push(priority);
    }

    // Search Filter
    if (search && search.trim() !== '') {
      baseSql += ` AND (c.complaint_number LIKE ? OR c.title LIKE ? OR c.location_address LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Count total matching complaints
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countRows = await query(countSql, params);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Sorting
    let sortSql = ' ORDER BY c.created_at DESC';
    if (sort === 'oldest') sortSql = ' ORDER BY c.created_at ASC';
    else if (sort === 'updated') sortSql = ' ORDER BY c.updated_at DESC';

    // Fetch paginated complaints
    const selectSql = `
      SELECT c.*, d.name as department_name, off_user.name as officer_name
      ${baseSql}
      ${sortSql}
      LIMIT ? OFFSET ?
    `;
    const selectParams = [...params, limitNum, offset];
    const complaints = await query(selectSql, selectParams);

    res.json({
      success: true,
      count: complaints.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      complaints
    });
  } catch (error) {
    console.error('Get Citizen Complaints Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch citizen complaints.'
    });
  }
}

module.exports = {
  getCitizenDashboard,
  getCitizenComplaints
};
