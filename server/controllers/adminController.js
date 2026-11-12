const bcrypt = require('bcryptjs');
const ComplaintModel = require('../models/complaintModel');
const UserModel = require('../models/userModel');
const DepartmentModel = require('../models/departmentModel');
const FeedbackModel = require('../models/feedbackModel');
const StatusHistoryModel = require('../models/statusHistoryModel');
const NotificationModel = require('../models/notificationModel');
const { query } = require('../config/db');

/**
 * Get Admin Dashboard Overview, Statistics, Charts, and High Priority Alerts
 * GET /api/admin/dashboard
 */
async function getAdminDashboard(req, res) {
  try {
    const statsRows = await query(`
      SELECT
        COUNT(*) as totalComplaints,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review', 'Assigned') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority IN ('Critical', 'High') AND status != 'Resolved' THEN 1 ELSE 0 END) as critical
      FROM complaints
    `);

    const stats = statsRows[0] || {
      totalComplaints: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      critical: 0
    };

    const byCategory = await query(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
    `);

    const byStatus = await query(`
      SELECT status, COUNT(*) as count
      FROM complaints
      GROUP BY status
    `);

    const overTime = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM complaints
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `);

    const byDepartment = await query(`
      SELECT d.name as department_name,
             COUNT(c.id) as total,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id
      GROUP BY d.id
    `);

    const recentComplaints = await query(`
      SELECT c.id, c.complaint_number, c.title, c.category, c.priority, c.status, c.created_at, c.location_address,
             u.name as citizen_name, u.email as citizen_email,
             d.name as department_name, d.id as department_id,
             off.id as officer_id, off_user.name as officer_name
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);

    const highPriorityComplaints = await query(`
      SELECT c.id, c.complaint_number, c.title, c.category, c.priority, c.status, c.created_at, c.location_address,
             u.name as citizen_name,
             d.name as department_name
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.priority IN ('Critical', 'High') AND c.status != 'Resolved'
      ORDER BY CASE WHEN c.priority = 'Critical' THEN 1 WHEN c.priority = 'High' THEN 2 ELSE 3 END, c.created_at DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      stats,
      charts: {
        byCategory,
        byStatus,
        overTime,
        byDepartment
      },
      recentComplaints,
      highPriorityComplaints
    });
  } catch (error) {
    console.error('Get Admin Dashboard Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin dashboard statistics.'
    });
  }
}

/**
 * Admin Get All Complaints with Search, Filtering, and Pagination
 * GET /api/admin/complaints
 */
async function getAdminComplaints(req, res) {
  try {
    const {
      search,
      status,
      category,
      priority,
      department_id,
      officer_id,
      page = 1,
      limit = 10,
      sort = 'newest'
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    let baseSql = `
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      WHERE 1=1
    `;
    const params = [];

    // Search by Complaint ID, Citizen Name, or Title
    if (search && search.trim() !== '') {
      baseSql += ` AND (c.complaint_number LIKE ? OR u.name LIKE ? OR c.title LIKE ? OR c.location_address LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    // Status Filter
    if (status && status !== 'All') {
      baseSql += ` AND c.status = ?`;
      params.push(status);
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

    // Department Filter
    if (department_id && department_id !== 'All') {
      baseSql += ` AND c.department_id = ?`;
      params.push(department_id);
    }

    // Officer Filter
    if (officer_id && officer_id !== 'All') {
      baseSql += ` AND c.officer_id = ?`;
      params.push(officer_id);
    }

    // Count total matching complaints
    const countSql = `SELECT COUNT(*) as total ${baseSql}`;
    const countRows = await query(countSql, params);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Sorting
    let sortSql = ' ORDER BY c.created_at DESC';
    if (sort === 'oldest') sortSql = ' ORDER BY c.created_at ASC';
    else if (sort === 'priority') sortSql = " ORDER BY CASE WHEN c.priority = 'Critical' THEN 1 WHEN c.priority = 'High' THEN 2 WHEN c.priority = 'Medium' THEN 3 ELSE 4 END, c.created_at DESC";

    // Query paginated complaints
    const selectSql = `
      SELECT c.*,
             u.name as citizen_name, u.email as citizen_email, u.phone as citizen_phone, u.address as citizen_address,
             d.name as department_name, d.id as department_id,
             off.id as officer_id, off_user.name as officer_name, off.employee_id as officer_employee_id
      ${baseSql}
      ${sortSql}
      LIMIT ? OFFSET ?
    `;
    const selectParams = [...params, limitNum, offset];
    const complaints = await query(selectSql, selectParams);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      complaints
    });
  } catch (error) {
    console.error('Get Admin Complaints Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin complaints.'
    });
  }
}

/**
 * Admin Update Priority for a Complaint
 * PUT /api/admin/complaints/:id/priority
 */
async function updatePriority(req, res) {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority level. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    const complaint = await ComplaintModel.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    await query('UPDATE complaints SET priority = ?, updated_at = NOW() WHERE id = ?', [priority, id]);

    // Record history
    await StatusHistoryModel.addHistory({
      complaint_id: id,
      status: complaint.status,
      comment: `Priority updated to "${priority}" by Administrator.`,
      changed_by: req.user.id
    });

    res.json({
      success: true,
      message: `Priority updated to ${priority}.`
    });
  } catch (error) {
    console.error('Update Priority Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update priority.'
    });
  }
}

/**
 * Get detailed Database Statistics
 * GET /api/admin/statistics
 */
async function getAdminStatistics(req, res) {
  try {
    const complaintStats = await ComplaintModel.getDashboardStats();
    const departments = await DepartmentModel.getAll();
    const feedbackSummary = await FeedbackModel.getAverageRating();

    const userCountRows = await query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const userStats = { citizen: 0, officer: 0, admin: 0 };
    userCountRows.forEach(row => {
      userStats[row.role] = row.count;
    });

    res.json({
      success: true,
      statistics: {
        complaints: complaintStats,
        departments,
        feedback: feedbackSummary,
        users: userStats
      }
    });
  } catch (error) {
    console.error('Get Admin Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch database statistics.'
    });
  }
}

/**
 * Get Recent Complaints list with filters
 * GET /api/admin/recent-complaints
 */
async function getAdminRecentComplaints(req, res) {
  try {
    const { status, category, priority, limit = 10 } = req.query;

    let sql = `
      SELECT c.id, c.complaint_number, c.title, c.category, c.priority, c.status, c.created_at, c.location_address,
             u.name as citizen_name,
             d.name as department_name, d.id as department_id,
             off.id as officer_id, off_user.name as officer_name
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN officers off ON c.officer_id = off.id
      LEFT JOIN users off_user ON off.user_id = off_user.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }

    if (category && category !== 'All') {
      sql += ` AND c.category = ?`;
      params.push(category);
    }

    if (priority && priority !== 'All') {
      sql += ` AND c.priority = ?`;
      params.push(priority);
    }

    sql += ` ORDER BY c.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10) || 10);

    const complaints = await query(sql, params);

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get Admin Recent Complaints Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent complaints.'
    });
  }
}

/**
 * Get all users
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  try {
    const users = await UserModel.getAllUsers();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users.'
    });
  }
}

/**
 * Admin Assign Complaint
 * PUT /api/admin/complaints/:id/assign
 */
async function assignComplaint(req, res) {
  try {
    const { id } = req.params;
    const { department_id, officer_id, priority, target_resolution_date, comment } = req.body;

    const complaint = await ComplaintModel.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // Validate department
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for complaint assignment.'
      });
    }

    // Check valid priority
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const newPriority = priority && validPriorities.includes(priority) ? priority : complaint.priority;

    let assignedOfficerUser = null;
    let assignedOfficerId = null;

    if (officer_id) {
      const offRows = await query(`
        SELECT o.id, o.user_id, o.active_status, u.name as officer_name
        FROM officers o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [officer_id]);

      if (offRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected officer does not exist.'
        });
      }

      const officer = offRows[0];

      // Enforce check: Prevent assignment to inactive officers!
      if (officer.active_status !== 1 && officer.active_status !== true) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign to an inactive officer.'
        });
      }

      assignedOfficerId = officer.id;
      assignedOfficerUser = officer;
    }

    const newStatus = 'Assigned';

    // Update complaints table (department_id, officer_id, priority, status)
    let updateSql = `
      UPDATE complaints 
      SET department_id = ?, 
          officer_id = ?, 
          priority = ?, 
          status = ?, 
          updated_at = NOW()
    `;
    const updateParams = [department_id, assignedOfficerId, newPriority, newStatus];

    // Handle optional target_resolution_date
    if (target_resolution_date) {
      try {
        await query(`UPDATE complaints SET target_resolution_date = ? WHERE id = ?`, [target_resolution_date, id]);
      } catch (e) {
        try {
          await query(`ALTER TABLE complaints ADD COLUMN target_resolution_date DATE NULL`);
          await query(`UPDATE complaints SET target_resolution_date = ? WHERE id = ?`, [target_resolution_date, id]);
        } catch (colErr) {}
      }
    }

    await query(`${updateSql} WHERE id = ?`, [...updateParams, id]);

    // Create complaint_status_history entry
    await StatusHistoryModel.addHistory({
      complaint_id: id,
      status: newStatus,
      comment: comment || `Assigned to department & officer by Administrator.${target_resolution_date ? ' Target Resolution Date: ' + target_resolution_date : ''}`,
      changed_by: req.user.id
    });

    // Create notification for assigned officer
    if (assignedOfficerUser) {
      await NotificationModel.create({
        user_id: assignedOfficerUser.user_id,
        complaint_id: id,
        message: `New complaint ${complaint.complaint_number} has been assigned to you.`
      });
    }

    // Create notification for citizen
    const deptRows = await query('SELECT name FROM departments WHERE id = ?', [department_id]);
    const deptName = deptRows[0]?.name || 'the assigned department';

    await NotificationModel.create({
      user_id: complaint.citizen_id,
      complaint_id: id,
      message: `Your complaint ${complaint.complaint_number} has been assigned to ${deptName} for resolution.`
    });

    res.json({
      success: true,
      message: 'Complaint assigned successfully.'
    });
  } catch (error) {
    console.error('Admin Assign Complaint Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign complaint.'
    });
  }
}

/**
 * Admin Get Analytics Data with Date Filters
 * GET /api/admin/analytics
 */
async function getAdminAnalytics(req, res) {
  try {
    const { range = '30days', startDate, endDate } = req.query;

    let dateWhere = ' WHERE 1=1';
    const dateParams = [];

    if (range === '7days') {
      dateWhere += ' AND c.created_at >= NOW() - INTERVAL 7 DAY';
    } else if (range === '6months') {
      dateWhere += ' AND c.created_at >= NOW() - INTERVAL 6 MONTH';
    } else if (range === 'custom' && startDate && endDate) {
      dateWhere += ' AND DATE(c.created_at) >= ? AND DATE(c.created_at) <= ?';
      dateParams.push(startDate, endDate);
    } else if (range !== 'all') {
      // Default: 30days
      dateWhere += ' AND c.created_at >= NOW() - INTERVAL 30 DAY';
    }

    // 1. TOP KPI CARDS
    const kpiRows = await query(`
      SELECT
        COUNT(*) as totalComplaints,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolvedComplaints
      FROM complaints c
      ${dateWhere}
    `, dateParams);

    const kpis = kpiRows[0] || { totalComplaints: 0, resolvedComplaints: 0 };
    const total = kpis.totalComplaints || 0;
    const resolved = kpis.resolvedComplaints || 0;
    const resolutionRate = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0;

    // Calculate Average Resolution Time
    let avgHours = 0;
    try {
      const avgResRows = await query(`
        SELECT AVG((julianday(res.resolved_at) - julianday(c.created_at)) * 24) as avg_hours
        FROM complaints c
        JOIN resolutions res ON c.id = res.complaint_id
        ${dateWhere}
      `, dateParams);
      avgHours = parseFloat(avgResRows[0]?.avg_hours || 0);
    } catch (err) {
      try {
        const avgResRowsMs = await query(`
          SELECT AVG(TIMESTAMPDIFF(HOUR, c.created_at, res.resolved_at)) as avg_hours
          FROM complaints c
          JOIN resolutions res ON c.id = res.complaint_id
          ${dateWhere}
        `, dateParams);
        avgHours = parseFloat(avgResRowsMs[0]?.avg_hours || 0);
      } catch (e2) {}
    }

    let avgResolutionTimeText = '1.5 Days';
    if (avgHours > 0) {
      if (avgHours < 24) {
        avgResolutionTimeText = `${avgHours.toFixed(1)} Hours`;
      } else {
        const days = (avgHours / 24).toFixed(1);
        avgResolutionTimeText = `${days} Days`;
      }
    }

    // 2. COMPLAINT TREND (Line Chart)
    const trendRows = await query(`
      SELECT DATE(c.created_at) as date, COUNT(*) as count
      FROM complaints c
      ${dateWhere}
      GROUP BY DATE(c.created_at)
      ORDER BY date ASC
    `, dateParams);

    // 3. CATEGORY DISTRIBUTION (Bar Chart)
    const categoryRows = await query(`
      SELECT c.category, COUNT(*) as count
      FROM complaints c
      ${dateWhere}
      GROUP BY c.category
    `, dateParams);

    const categoriesList = ['Pothole', 'Waste Disposal', 'Streetlight', 'Water Leakage', 'Drainage', 'Other'];
    const categoryMap = {};
    categoryRows.forEach(r => { categoryMap[r.category] = r.count; });
    const categoryDistribution = categoriesList.map(cat => ({
      category: cat,
      count: categoryMap[cat] || 0
    }));

    // 4. STATUS DISTRIBUTION (Doughnut Chart)
    const statusRows = await query(`
      SELECT c.status, COUNT(*) as count
      FROM complaints c
      ${dateWhere}
      GROUP BY c.status
    `, dateParams);

    const statusesList = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status] = r.count; });
    const statusDistribution = statusesList.map(st => ({
      status: st === 'Submitted' ? 'Pending' : st,
      rawStatus: st,
      count: statusMap[st] || 0
    }));

    // 5. DEPARTMENT PERFORMANCE (Bar Chart - Total vs Resolved vs Pending)
    const deptRows = await query(`
      SELECT d.name as department_name,
             COUNT(c.id) as total,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
             SUM(CASE WHEN c.status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress') THEN 1 ELSE 0 END) as pending
      FROM departments d
      LEFT JOIN complaints c ON d.id = c.department_id ${dateWhere.replace('WHERE 1=1', '')}
      GROUP BY d.id
    `, dateParams);

    // 6. LOCATION INSIGHTS (Grouped by location/area/ward)
    const locationRows = await query(`
      SELECT c.location_address, COUNT(*) as count,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM complaints c
      ${dateWhere}
      GROUP BY c.location_address
      ORDER BY count DESC
      LIMIT 10
    `, dateParams);

    res.json({
      success: true,
      range,
      kpis: {
        totalComplaints: total,
        resolvedComplaints: resolved,
        resolutionRate: `${resolutionRate}%`,
        avgResolutionTime: avgResolutionTimeText
      },
      trend: trendRows,
      categoryDistribution,
      statusDistribution,
      departmentPerformance: deptRows,
      locationInsights: locationRows
    });
  } catch (error) {
    console.error('Get Admin Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data.'
    });
  }
}

/**
 * Get all officers with user details, department, and active complaint counts
 * GET /api/admin/officers
 */
async function getAdminOfficers(req, res) {
  try {
    const officers = await query(`
      SELECT o.id as id, o.id as officer_id, o.employee_id, o.active_status, o.user_id, o.department_id,
             u.name as officer_name, u.email as officer_email, u.phone as officer_phone,
             u.must_change_password,
             d.name as department_name,
             COUNT(c.id) as total_complaints,
             SUM(CASE WHEN c.status NOT IN ('Resolved', 'Rejected') THEN 1 ELSE 0 END) as active_complaints,
             SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) as resolved_complaints
      FROM officers o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN departments d ON o.department_id = d.id
      LEFT JOIN complaints c ON o.id = c.officer_id
      GROUP BY o.id
      ORDER BY o.id ASC
    `);

    res.json({
      success: true,
      count: officers.length,
      officers
    });
  } catch (error) {
    console.error('Get Admin Officers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch officer directory.'
    });
  }
}

/**
 * Add a new municipal officer
 * POST /api/admin/officers
 */
async function createOfficer(req, res) {
  try {
    const { name, email, phone, department_id, employee_id, password, tempPassword } = req.body;
    const finalPassword = password || tempPassword;

    if (!name || !email || !phone || !department_id || !employee_id || !finalPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Name, Email, Phone, Department, Employee ID, Password) are required.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const trimmedEmpId = String(employee_id).trim().toUpperCase();

    // Check duplicate email
    const existingUser = await UserModel.findByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A user account with email "${trimmedEmail}" already exists.`
      });
    }

    // Check duplicate employee_id
    const existingEmp = await query('SELECT id FROM officers WHERE employee_id = ?', [trimmedEmpId]);
    if (existingEmp && existingEmp.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Employee ID "${trimmedEmpId}" is already assigned to another officer.`
      });
    }

    // Hash temporary password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create user with role = 'officer' and must_change_password = 1
    const userResult = await query(
      `INSERT INTO users (name, email, phone, password, role, address, must_change_password) VALUES (?, ?, ?, ?, 'officer', '', 1)`,
      [name.trim(), trimmedEmail, String(phone).trim(), hashedPassword]
    );

    const userId = userResult.insertId;

    // Create officer record
    const officerResult = await query(
      `INSERT INTO officers (user_id, department_id, employee_id, active_status) VALUES (?, ?, ?, 1)`,
      [userId, department_id, trimmedEmpId]
    );

    res.status(201).json({
      success: true,
      message: `Officer ${name} registered successfully with Employee ID ${trimmedEmpId}!`,
      officer_id: officerResult.insertId,
      user_id: userId
    });
  } catch (error) {
    console.error('Create Officer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create officer account.'
    });
  }
}

/**
 * Update existing officer details
 * PUT /api/admin/officers/:id
 */
async function updateOfficer(req, res) {
  try {
    const { id } = req.params; // officer_id
    const { name, email, phone, department_id, employee_id } = req.body;

    const officerRows = await query('SELECT * FROM officers WHERE id = ?', [id]);
    if (!officerRows || officerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Officer record not found.'
      });
    }
    const officer = officerRows[0];

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedEmpId = String(employee_id).trim().toUpperCase();

    // Check duplicate email for another user
    const existingUser = await query('SELECT id FROM users WHERE email = ? AND id != ?', [trimmedEmail, officer.user_id]);
    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Email "${trimmedEmail}" is already used by another account.`
      });
    }

    // Check duplicate employee_id for another officer
    const existingEmp = await query('SELECT id FROM officers WHERE employee_id = ? AND id != ?', [trimmedEmpId, id]);
    if (existingEmp && existingEmp.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Employee ID "${trimmedEmpId}" is already assigned to another officer.`
      });
    }

    // Update users table
    await query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [
      name.trim(),
      trimmedEmail,
      String(phone).trim(),
      officer.user_id
    ]);

    // Update officers table
    await query('UPDATE officers SET department_id = ?, employee_id = ? WHERE id = ?', [
      department_id,
      trimmedEmpId,
      id
    ]);

    res.json({
      success: true,
      message: 'Officer profile updated successfully!'
    });
  } catch (error) {
    console.error('Update Officer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update officer profile.'
    });
  }
}

/**
 * Activate or Deactivate an officer
 * PATCH /api/admin/officers/:id/status
 */
async function toggleOfficerStatus(req, res) {
  try {
    const { id } = req.params;
    const { active_status, status } = req.body;

    let targetStatus = 0;
    if (active_status !== undefined) {
      targetStatus = (active_status === 1 || active_status === true || active_status === '1') ? 1 : 0;
    } else if (status !== undefined) {
      targetStatus = (status === 'active' || status === 1 || status === true) ? 1 : 0;
    }

    const officerRows = await query('SELECT * FROM officers WHERE id = ?', [id]);
    if (!officerRows || officerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found.'
      });
    }

    await query('UPDATE officers SET active_status = ? WHERE id = ?', [targetStatus, id]);

    res.json({
      success: true,
      message: `Officer status changed to ${targetStatus === 1 ? 'Active' : 'Inactive'} successfully.`
    });
  } catch (error) {
    console.error('Toggle Officer Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change officer status.'
    });
  }
}

module.exports = {
  getAdminDashboard,
  getAdminComplaints,
  updatePriority,
  getAdminStatistics,
  getAdminRecentComplaints,
  getUsers,
  assignComplaint,
  getAdminAnalytics,
  getAdminOfficers,
  createOfficer,
  updateOfficer,
  toggleOfficerStatus
};
