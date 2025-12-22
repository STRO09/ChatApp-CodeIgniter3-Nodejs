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

const router = express.Router();

// Private conversations
router.post('/conversation', getOrCreateConversation);
router.get('/:userId/conversations', getUserConversations);
router.get('/conversation/find/:userId1/:userId2', findConversationBetweenUsers);
router.get('/conversation/:conversationId', getConversationById);

// Group conversations
router.post('/group', createGroupConversation);
router.get('/:userId/groups', getGroupConversations);

// Group management routes
router.post('/group/add', addUserToGroup);
router.post('/group/remove', removeUserFromGroup);
router.delete('/group/:conversationId', deleteGroupConversation);

// Unread messages management
router.post('/conversation/:conversationId/read', markConversationAsRead);
router.get('/unread/:userId', getTotalUnreadCount);

export default router;