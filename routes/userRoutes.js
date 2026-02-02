import express from 'express';
import { registerUser, loginUser ,getAllUsersForChat,getAllUsers,updateUserStatus, updateUserProfile, getUserById, forgotPassword, resetPassword, verifyResetToken} from '../controllers/userController.js';
import { getOrCreateAiConversation } from '../controllers/aiController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/users/chat/:userId', getAllUsersForChat);
router.get('/users/all/:userId', getAllUsers); 
router.put('/user/:userId/status', updateUserStatus);
router.post('/user/update-profile', updateUserProfile);
router.get("/user/:userId", getUserById);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

// AI chat
router.post('/ai/conversation', getOrCreateAiConversation);

export default router;
