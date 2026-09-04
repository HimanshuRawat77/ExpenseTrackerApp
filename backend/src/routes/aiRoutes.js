const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const auth = require('../middleware/auth');

router.get('/insights', auth, aiController.getInsights);

module.exports = router;
