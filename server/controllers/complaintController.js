const ComplaintModel = require('../models/complaintModel');
const StatusHistoryModel = require('../models/statusHistoryModel');
const NotificationModel = require('../models/notificationModel');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Submit a new grievance complaint
 * POST /api/complaints
 */
async function createComplaint(req, res) {
  try {
    const {
      category,
      title,
      description,
      address,
      area,
      city,
      pincode,
      location_address,
      latitude,
      longitude,
      priority
    } = req.body;
    
    const citizen_id = req.user.id;

    if (!category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, title, and description are required.'
      });
    }

    let fullLocationAddress = location_address;
    if (!fullLocationAddress || fullLocationAddress.trim() === '') {
      const parts = [address, area, city, pincode].filter(Boolean);
      fullLocationAddress = parts.join(', ');
    }

    if (!fullLocationAddress || fullLocationAddress.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide location address details.'
      });
    }

    let image_url = null;
    if (req.file) {
      image_url = await uploadToCloudinary(req.file, 'complaints');
    }

    const { id, complaint_number } = await ComplaintModel.create({
      citizen_id,
      category,
      title,
      description,
      image_url,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      location_address: fullLocationAddress.trim(),
      priority: priority || 'Medium'
    });

    await StatusHistoryModel.addHistory({
      complaint_id: id,
      status: 'Submitted',
      comment: 'Grievance submitted by citizen via public portal.',
      changed_by: citizen_id
    });

    await NotificationModel.create({
      user_id: citizen_id,
      complaint_id: id,
      message: `Your grievance ${complaint_number} has been submitted successfully and is under initial review.`
    });

    if (priority === 'High' || priority === 'Critical') {
      const { query } = require('../config/db');
      const adminUsers = await query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of adminUsers) {
        await NotificationModel.create({
          user_id: admin.id,
          complaint_id: id,
          message: `New high-priority complaint ${complaint_number} submitted.`
        });
      }
    }

    const newComplaint = await ComplaintModel.findById(id);

    res.status(201).json({
      success: true,
      message: 'Complaint Submitted Successfully',
      complaint: newComplaint
    });
  } catch (error) {
    console.error('Create Complaint Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. Please check form data and try again.'
    });
  }
}

/**
 * Get complaints with role-based scoping and search/filtering
 * GET /api/complaints
 */
async function getComplaints(req, res) {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      priority: req.query.priority,
      search: req.query.search
    };

    if (req.user.role === 'citizen') {
      filters.citizen_id = req.user.id;
    } else if (req.user.role === 'officer') {
      if (req.query.scope === 'my') {
        filters.officer_id = req.user.officer_id;
      } else {
        filters.department_id = req.user.department_id;
      }
    } else if (req.user.role === 'admin') {
      if (req.query.department_id) filters.department_id = req.query.department_id;
      if (req.query.officer_id) filters.officer_id = req.query.officer_id;
    }

    const complaints = await ComplaintModel.findAll(filters);

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get Complaints Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints.'
    });
  }
}

/**
 * Get complaint details by ID (with security role check)
 * GET /api/complaints/:id
 */
async function getComplaintById(req, res) {
  try {
    const { id } = req.params;
    const complaint = await ComplaintModel.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // Role check: Citizen can ONLY view their own complaints
    if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to view this complaint.'
      });
    }

    // Fetch status history timeline
    const history = await StatusHistoryModel.getByComplaintId(id);

    res.json({
      success: true,
      complaint,
      history
    });
  } catch (error) {
    console.error('Get Complaint By Id Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint details.'
    });
  }
}

/**
 * Get status history timeline for a complaint
 * GET /api/complaints/:id/history
 */
async function getComplaintHistory(req, res) {
  try {
    const { id } = req.params;
    const complaint = await ComplaintModel.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    const history = await StatusHistoryModel.getByComplaintId(id);

    res.json({
      success: true,
      complaint_number: complaint.complaint_number,
      history
    });
  } catch (error) {
    console.error('Get Complaint History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint timeline history.'
    });
  }
}

/**
 * Update complaint status
 * PUT /api/complaints/:id/status
 */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const validStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const complaint = await ComplaintModel.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    await ComplaintModel.updateStatus(id, status);

    await StatusHistoryModel.addHistory({
      complaint_id: id,
      status,
      comment: comment || `Status updated to ${status}`,
      changed_by: req.user.id
    });

    await NotificationModel.create({
      user_id: complaint.citizen_id,
      complaint_id: id,
      message: `Your complaint ${complaint.complaint_number} status has been updated to "${status}".`
    });

    res.json({
      success: true,
      message: `Complaint status updated to ${status}.`
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status.'
    });
  }
}

/**
 * Assign department, officer & priority (Admin action)
 * PUT /api/complaints/:id/assign
 */
async function assignComplaint(req, res) {
  try {
    const { id } = req.params;
    const { department_id, officer_id, priority, comment } = req.body;

    const complaint = await ComplaintModel.findById(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    const newStatus = officer_id ? 'Assigned' : 'Under Review';

    await ComplaintModel.assignDepartmentAndOfficer(id, {
      department_id,
      officer_id: officer_id || null,
      priority,
      status: newStatus
    });

    await StatusHistoryModel.addHistory({
      complaint_id: id,
      status: newStatus,
      comment: comment || `Assigned to department & officer by Administrator.`,
      changed_by: req.user.id
    });

    await NotificationModel.create({
      user_id: complaint.citizen_id,
      complaint_id: id,
      message: `Your complaint ${complaint.complaint_number} has been assigned for resolution.`
    });

    if (officer_id) {
      const { query } = require('../config/db');
      const offRows = await query('SELECT user_id FROM officers WHERE id = ?', [officer_id]);
      if (offRows.length > 0) {
        await NotificationModel.create({
          user_id: offRows[0].user_id,
          complaint_id: id,
          message: `New complaint ${complaint.complaint_number} assigned to you.`
        });
      }
    }

    res.json({
      success: true,
      message: 'Complaint assignment updated successfully.'
    });
  } catch (error) {
    console.error('Assign Complaint Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign complaint.'
    });
  }
}

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  getComplaintHistory,
  updateStatus,
  assignComplaint
};
