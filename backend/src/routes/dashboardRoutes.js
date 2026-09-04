const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

router.get('/summary', auth, dashboardController.getSummary);
router.get('/safe-to-spend', auth, dashboardController.getSafeToSpend);
router.get('/trends', auth, dashboardController.getTrends);

module.exports = router;
