const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/statistics', publicController.getPublicStatistics);

module.exports = router;
