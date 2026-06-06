const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const authMiddleware = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

// GET /api/logs  (admin+ only)
router.get('/', authMiddleware, role('admin', 'system_manager', 'system_administrator'), logController.getLogs);

module.exports = router;
