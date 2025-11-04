const AppError = require('../utils/error.utils');
const chatService = require('../services/chatService');

module.exports = {
  async createConversation(req, res, next) {
    try {
      const { participantId } = req.body;
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));
      if (!participantId) return next(new AppError('participantId is required', 400));
      const convo = await chatService.createConversation(userId, participantId);
      console.log(convo);
      res.status(201).json({ success: true, data: convo });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  },

  async sendMessage(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));
      const { receiverId, text, media, replyTo } = req.body;
      if (!receiverId) return next(new AppError('receiverId is required', 400));
      const result = await chatService.sendMessage({ senderId: userId, receiverId, text, media, replyTo });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  },

  async getChatList(req, res, next) {
    try {
      
      console.log("USER ID IS COMING OR NOT : ",req.user)
      const userId = req.user?.id;
      
      // "ee600e52-7efc-476c-8a5a-dea797ff495d"
      if (!userId) return next(new AppError('Unauthorized', 401));
      const { limit, offset } = req.query;
      const data = await chatService.getChatList(userId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      });
      console.log(data)
      res.json({ success: true, data });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  },

  async getMessages(req, res, next) {
    try {
      const userId = req.user?.id;
      // "ee600e52-7efc-476c-8a5a-dea797ff495d"      if (!userId) return next(new AppError('Unauthorized', 401));
      const { conversationId } = req.params;
      const { limit, before } = req.query;
      const data = await chatService.getMessages(conversationId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        before,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  },

  async markAsSeen(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return next(new AppError('Unauthorized', 401));
      const { conversationId } = req.body;
      if (!conversationId) return next(new AppError('conversationId is required', 400));
      const data = await chatService.markAsSeen(conversationId, userId);
      res.json({ success: true, data });
    } catch (err) {
      next(new AppError(err.message, 400));
    }
  },
};
