const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/dashboard', authenticateToken, authorizeRoles('officer'), officerController.getOfficerDashboard);
router.get('/complaints', authenticateToken, authorizeRoles('officer'), officerController.getOfficerComplaints);
router.get('/complaints/:id', authenticateToken, authorizeRoles('officer'), officerController.getOfficerComplaintById);
router.get('/', authenticateToken, authorizeRoles('admin'), officerController.getAllOfficers);
router.get('/department/:deptId', authenticateToken, officerController.getOfficersByDepartment);

// Officer submits resolution details & evidence image
router.post('/resolve', authenticateToken, authorizeRoles('officer'), upload.single('evidence_image'), officerController.submitResolution);
router.post('/complaints/:id/resolve', authenticateToken, authorizeRoles('officer'), upload.single('evidence_image'), officerController.submitResolution);

module.exports = router;
