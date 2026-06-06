const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users/list  (protected — returns all users except current user)
router.get('/list', authMiddleware, fileController.getUsers);

// PUT /api/users/change-password  (protected — authenticated user only)
router.put('/change-password', authMiddleware, userController.changePassword);

module.exports = router;
