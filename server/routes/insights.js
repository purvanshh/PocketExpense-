const express = require('express');
const router = express.Router();
const { getAdvancedInsights } = require('../controllers/insightController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/advanced', getAdvancedInsights);

module.exports = router;
