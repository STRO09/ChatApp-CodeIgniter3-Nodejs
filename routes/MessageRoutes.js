import express from 'express';
import multer from 'multer';
import { getMessages, addMessage, getSecureFile } from '../controllers/messageController.js';
import { findConversationBetweenUsers } from '../controllers/conversationController.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeFileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, audio, pdf, and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mpeg',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Routes
router.get('/messages/:conversationId', getMessages);
router.post('/messages', upload.single('file'), addMessage);
router.get('/messages/file/:messageId/:fileName', getSecureFile);
router.get('/conversation/find/:userId1/:userId2', findConversationBetweenUsers);

export default router;