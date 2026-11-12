const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const officerController = require('../controllers/officerController');

router.get('/', departmentController.getDepartments);
router.get('/:id/officers', authenticateToken, officerController.getOfficersByDepartment);
router.post('/', authenticateToken, authorizeRoles('admin'), departmentController.createDepartment);
router.put('/:id', authenticateToken, authorizeRoles('admin'), departmentController.updateDepartment);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), departmentController.deleteDepartment);

module.exports = router;
