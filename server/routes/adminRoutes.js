const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const departmentController = require('../controllers/departmentController');

// All endpoints require Admin role authorization
router.get('/dashboard', authenticateToken, authorizeRoles('admin'), adminController.getAdminDashboard);
router.get('/analytics', authenticateToken, authorizeRoles('admin'), adminController.getAdminAnalytics);
router.get('/complaints', authenticateToken, authorizeRoles('admin'), adminController.getAdminComplaints);
router.put('/complaints/:id/assign', authenticateToken, authorizeRoles('admin'), adminController.assignComplaint);
router.put('/complaints/:id/priority', authenticateToken, authorizeRoles('admin'), adminController.updatePriority);
router.get('/departments', authenticateToken, authorizeRoles('admin'), departmentController.getDepartments);
router.post('/departments', authenticateToken, authorizeRoles('admin'), departmentController.createDepartment);
router.put('/departments/:id', authenticateToken, authorizeRoles('admin'), departmentController.updateDepartment);
router.delete('/departments/:id', authenticateToken, authorizeRoles('admin'), departmentController.deleteDepartment);
router.get('/statistics', authenticateToken, authorizeRoles('admin'), adminController.getAdminStatistics);
router.get('/recent-complaints', authenticateToken, authorizeRoles('admin'), adminController.getAdminRecentComplaints);
router.get('/users', authenticateToken, authorizeRoles('admin'), adminController.getUsers);

// Officer Management Endpoints
router.get('/officers', authenticateToken, authorizeRoles('admin'), adminController.getAdminOfficers);
router.post('/officers', authenticateToken, authorizeRoles('admin'), adminController.createOfficer);
router.put('/officers/:id', authenticateToken, authorizeRoles('admin'), adminController.updateOfficer);
router.patch('/officers/:id/status', authenticateToken, authorizeRoles('admin'), adminController.toggleOfficerStatus);

module.exports = router;
