const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Citizens create complaints
router.post('/', authenticateToken, authorizeRoles('citizen'), upload.single('image'), complaintController.createComplaint);

// All authenticated users can view complaints scoped by role
router.get('/', authenticateToken, complaintController.getComplaints);

// View complaint details by ID
router.get('/:id', authenticateToken, complaintController.getComplaintById);

// View complaint timeline history
router.get('/:id/history', authenticateToken, complaintController.getComplaintHistory);

// Citizen feedback endpoints
router.post('/:id/feedback', authenticateToken, authorizeRoles('citizen'), feedbackController.submitFeedback);
router.get('/:id/feedback', authenticateToken, feedbackController.getFeedbackByComplaint);

// Update complaint status (Officers & Admins)
router.put('/:id/status', authenticateToken, authorizeRoles('officer', 'admin'), complaintController.updateStatus);

// Assign department/officer/priority (Admin only)
router.put('/:id/assign', authenticateToken, authorizeRoles('admin'), complaintController.assignComplaint);

module.exports = router;
