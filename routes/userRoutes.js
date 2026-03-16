import express from 'express';
import { registerUser, loginUser , logoutUser, logoutAllDevices , getAllUsersForChat,getAllUsers, getActiveSessions, updateUserStatus, revokeUserSession , updateUserProfile, getUserById, forgotPassword, resetPassword, verifyResetToken, refreshAccessToken } from '../controllers/userController.js';
import { getOrCreateAiConversation } from '../controllers/aiController.js';
import {
  authenticateToken
} from "../middleware/authMiddleware.js";


const router = express.Router();

router.post('/v1/register', registerUser);
router.post('/v1/login', loginUser);
router.post("/refresh", refreshAccessToken);

// Logout
router.post("/logout", authenticateToken, logoutUser);
router.post("/logout-all", authenticateToken, logoutAllDevices);

// Session Management
router.get("/sessions", authenticateToken, getActiveSessions);
router.delete("/sessions/:sessionId", authenticateToken, revokeUserSession);

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
