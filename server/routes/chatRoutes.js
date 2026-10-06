const express = require('express');
const router = express.Router();
const { handleChat } = require('../controllers/chatController');

// POST /api/chat - agricultural chatbot
router.post('/', handleChat);

module.exports = router;
