const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, profileController.updateProfile);
router.put('/password', authenticateToken, profileController.updatePassword);

module.exports = router;
