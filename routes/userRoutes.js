import express from 'express';
import { registerUser, loginUser ,getAllUsersForChat,getAllUsers,updateUserStatus, updateUserProfile, getUserById} from '../controllers/userController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/users/chat/:userId', getAllUsersForChat);
router.get('/users/all/:userId', getAllUsers); 
router.put('/user/:userId/status', updateUserStatus);
router.post('/user/update-profile', updateUserProfile);
router.get("/user/:userId", getUserById);

export default router;
