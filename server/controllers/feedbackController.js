const FeedbackModel = require('../models/feedbackModel');
const ComplaintModel = require('../models/complaintModel');
const NotificationModel = require('../models/notificationModel');

/**
 * Submit citizen feedback for a resolved complaint
 * POST /api/complaints/:id/feedback (and POST /api/feedback)
 */
async function submitFeedback(req, res) {
  try {
    const complaint_id = req.params.id || req.body.complaint_id;
    const { rating, resolution_status, comment } = req.body;
    const citizen_id = req.user.id;

    if (!complaint_id) {
      return res.status(400).json({
        success: false,
        message: 'Complaint ID is required.'
      });
    }

    // 1. Fetch complaint details
    const complaint = await ComplaintModel.findById(complaint_id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found.'
      });
    }

    // 2. Security validation: Complaint MUST belong to logged-in citizen
    if (complaint.citizen_id !== citizen_id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only the citizen who reported this grievance can submit feedback.'
      });
    }

    // 3. Status validation: Complaint MUST be Resolved
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted after complaint status becomes Resolved.'
      });
    }

    // 4. Duplicate check: Feedback cannot already exist
    const existingFeedback = await FeedbackModel.getByComplaintId(complaint_id);
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this complaint.'
      });
    }

    // 5. Rating validation: Must be integer between 1 and 5
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a valid number between 1 and 5 stars.'
      });
    }

    // Map resolution options (Yes -> Satisfied, Partially -> Partially Resolved, No -> Unsatisfied)
    let mappedStatus = resolution_status || 'Satisfied';
    if (resolution_status === 'Yes') mappedStatus = 'Satisfied';
    else if (resolution_status === 'Partially') mappedStatus = 'Partially Resolved';
    else if (resolution_status === 'No') mappedStatus = 'Unsatisfied';

    // Insert feedback record
    await FeedbackModel.create({
      complaint_id,
      citizen_id,
      rating: parsedRating,
      resolution_status: mappedStatus,
      comment: comment ? comment.trim() : ''
    });

    // Notify assigned officer if present
    if (complaint.officer_id) {
      const { query } = require('../config/db');
      const offRows = await query('SELECT user_id FROM officers WHERE id = ?', [complaint.officer_id]);
      if (offRows.length > 0) {
        await NotificationModel.create({
          user_id: offRows[0].user_id,
          complaint_id,
          message: `Citizen submitted a ${parsedRating}-star rating feedback for complaint ${complaint.complaint_number}.`
        });
      }
    }

    res.json({
      success: true,
      message: 'Thank you for your feedback! Your review has been saved.'
    });
  } catch (error) {
    console.error('Submit Feedback Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.'
    });
  }
}

/**
 * Get feedback details for a complaint
 * GET /api/complaints/:id/feedback
 */
async function getFeedbackByComplaint(req, res) {
  try {
    const complaint_id = req.params.id || req.params.complaintId;
    const complaint = await ComplaintModel.findById(complaint_id);

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

    const feedback = await FeedbackModel.getByComplaintId(complaint_id);

    res.json({
      success: true,
      complaint,
      feedback
    });
  } catch (error) {
    console.error('Get Feedback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback.'
    });
  }
}

module.exports = {
  submitFeedback,
  getFeedbackByComplaint
};
