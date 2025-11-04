const express = require('express');
const router = express.Router();
const chatController = require('../../controllers/chatController');
const jwtAuth = require('../../middleware/jwtAuth');

// ---------------- TEMP: remove auth middleware ----------------
router.post('/conversations',jwtAuth, chatController.createConversation);
router.get('/chats',jwtAuth, chatController.getChatList);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages',jwtAuth, chatController.sendMessage);
router.post('/messages/seen', chatController.markAsSeen);

module.exports = router;
