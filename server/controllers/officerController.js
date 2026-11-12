const OfficerModel = require('../models/officerModel');
const ComplaintModel = require('../models/complaintModel');
const ResolutionModel = require('../models/resolutionModel');
const StatusHistoryModel = require('../models/statusHistoryModel');
const NotificationModel = require('../models/notificationModel');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Get all officers
 * GET /api/officers
 */
async function getAllOfficers(req, res) {
  try {
    const officers = await OfficerModel.getAll();
    res.json({
      success: true,
      officers
    });
  } catch (error) {
    console.error('Get All Officers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch officers.'
    });
  }
}

/**
 * Get active officers by department ID
 * GET /api/departments/:id/officers or GET /api/officers/department/:deptId
 */
async function getOfficersByDepartment(req, res) {
  try {
    const deptId = req.params.id || req.params.deptId;
    const officers = await OfficerModel.getByDepartment(deptId);
    res.json({
      success: true,
      officers
    });
  } catch (error) {
    console.error('Get Officers By Department Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department officers.'
    });
  }
}

/**
 * Officer submits resolution for an assigned complaint
 * POST /api/officers/resolve
 */
async function submitResolution(req, res) {
  try {
    const { complaint_id, description } = req.body;
    const officer_id = req.user.officer_id;

    if (!complaint_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID and resolution description are required.'
      });
    }

    if (!officer_id) {
      return res.status(403).json({
        success: false,
        message: 'Only registered officers can submit resolution proof.'
      });
    }

    const complaint = await ComplaintModel.findById(complaint_id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    if (req.user.role === 'officer' && complaint.officer_id !== req.user.officer_id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only the assigned officer can modify or resolve this complaint.'
      });
    }

    let evidence_image_url = null;
    if (req.file) {
      evidence_image_url = await uploadToCloudinary(req.file, 'resolutions');
    }

    // Insert or update resolution record
    await ResolutionModel.create({
      complaint_id,
      officer_id,
      description,
      evidence_image_url
    });

    // Update complaint status to Resolved
    await ComplaintModel.updateStatus(complaint_id, 'Resolved');

    // Insert history
    await StatusHistoryModel.addHistory({
      complaint_id,
      status: 'Resolved',
      comment: `Resolution submitted by Officer: ${description.substring(0, 100)}...`,
      changed_by: req.user.id
    });

    // Notify citizen
    await NotificationModel.create({
      user_id: complaint.citizen_id,
      complaint_id,
      message: `Great news! Your complaint ${complaint.complaint_number} has been resolved by the department. Please view evidence and leave feedback.`
    });

    res.json({
      success: true,
      message: 'Complaint resolution submitted successfully!'
    });
  } catch (error) {
    console.error('Submit Resolution Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint resolution.'
    });
  }
}

const { query } = require('../config/db');

/**
 * Get Officer Dashboard Overview & Statistics
 * GET /api/officer/dashboard or GET /api/officers/dashboard
 */
async function getOfficerDashboard(req, res) {
  try {
    const officer_id = req.user.officer_id;
    if (!officer_id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. User is not registered as a field officer.'
      });
    }

    const statsRows = await query(`
      SELECT
        COUNT(*) as totalAssigned,
        SUM(CASE WHEN status IN ('Submitted', 'Under Review', 'Assigned') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
      FROM complaints
      WHERE officer_id = ?
    `, [officer_id]);

    const stats = statsRows[0] || {
      totalAssigned: 0,
      pending: 0,
      inProgress: 0,
      resolved: 0
    };

    res.json({
      success: true,
      officer: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        officer_id: req.user.officer_id,
        department_id: req.user.department_id,
        employee_id: req.user.employee_id
      },
      stats
    });
  } catch (error) {
    console.error('Get Officer Dashboard Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch officer dashboard statistics.'
    });
  }
}

/**
 * Get Complaints assigned strictly to the logged-in officer
 * GET /api/officer/complaints or GET /api/officers/complaints
 */
async function getOfficerComplaints(req, res) {
  try {
    const officer_id = req.user.officer_id;
    if (!officer_id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Access restricted to assigned officer only.'
      });
    }

    const { status, priority, category } = req.query;

    let sql = `
      SELECT c.*,
             u.name as citizen_name, u.email as citizen_email, u.phone as citizen_phone,
             d.name as department_name
      FROM complaints c
      JOIN users u ON c.citizen_id = u.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.officer_id = ?
    `;
    const params = [officer_id];

    if (status && status !== 'All') {
      sql += ` AND c.status = ?`;
      params.push(status);
    }
    if (priority && priority !== 'All') {
      sql += ` AND c.priority = ?`;
      params.push(priority);
    }
    if (category && category !== 'All') {
      sql += ` AND c.category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY CASE WHEN c.priority = 'Critical' THEN 1 WHEN c.priority = 'High' THEN 2 ELSE 3 END, c.created_at DESC`;

    const complaints = await query(sql, params);

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get Officer Complaints Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned complaints.'
    });
  }
}

/**
 * Get single complaint details for officer with assignment security check
 * GET /api/officer/complaints/:id
 */
async function getOfficerComplaintById(req, res) {
  try {
    const { id } = req.params;
    const complaint = await ComplaintModel.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // Role Security Check: Only the assigned officer (or admin) can access/modify this complaint
    if (req.user.role === 'officer' && complaint.officer_id !== req.user.officer_id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only the assigned officer can view or modify this complaint.'
      });
    }

    const history = await StatusHistoryModel.getByComplaintId(id);

    res.json({
      success: true,
      complaint,
      history
    });
  } catch (error) {
    console.error('Get Officer Complaint By Id Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint details.'
    });
  }
}

module.exports = {
  getAllOfficers,
  getOfficersByDepartment,
  submitResolution,
  getOfficerDashboard,
  getOfficerComplaints,
  getOfficerComplaintById
};
