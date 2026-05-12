import express from 'express';
import {
  getOrCreateConversation,
  getUserConversations,
  findConversationBetweenUsers,
  createGroupConversation,
  getGroupConversations,
  getConversationById,
  addUserToGroup,
  removeUserFromGroup,
  deleteGroupConversation,
  markConversationAsRead,
  getTotalUnreadCount
} from '../controllers/conversationController.js';
import { authenticateAndVerifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Private conversations
router.post('/conversation', authenticateAndVerifyUser, getOrCreateConversation);
router.get('/:userId/conversations', authenticateAndVerifyUser, getUserConversations);
router.get('/conversation/find/:userId1/:userId2', authenticateAndVerifyUser, findConversationBetweenUsers);
router.get('/conversation/:conversationId', authenticateAndVerifyUser, getConversationById);

// Group conversations
router.post('/group', authenticateAndVerifyUser, createGroupConversation);
router.get('/:userId/groups', authenticateAndVerifyUser, getGroupConversations);

// Group management routes
router.post('/group/add', authenticateAndVerifyUser, addUserToGroup);
router.post('/group/remove', authenticateAndVerifyUser, removeUserFromGroup);
router.delete('/group/:conversationId', authenticateAndVerifyUser, deleteGroupConversation);

// Unread messages management
router.post('/conversation/:conversationId/read', authenticateAndVerifyUser, markConversationAsRead);
router.get('/unread/:userId', authenticateAndVerifyUser, getTotalUnreadCount);

export default router;