const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, authorizeRoles('citizen'), feedbackController.submitFeedback);
router.get('/:complaintId', authenticateToken, feedbackController.getFeedbackByComplaint);

module.exports = router;
