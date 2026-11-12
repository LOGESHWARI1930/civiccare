const express = require('express');
const router = express.Router();
const citizenController = require('../controllers/citizenController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const complaintController = require('../controllers/complaintController');

// All citizen endpoints require authenticated citizen token
router.get('/dashboard', authenticateToken, authorizeRoles('citizen'), citizenController.getCitizenDashboard);
router.get('/complaints', authenticateToken, authorizeRoles('citizen'), citizenController.getCitizenComplaints);
router.get('/complaints/:id', authenticateToken, authorizeRoles('citizen'), complaintController.getComplaintById);

module.exports = router;
