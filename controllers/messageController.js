import Message from '../models/Messages.js';
import Conversation from '../models/Conversations.js';
import path from 'path';
import fs from 'fs';

// Get all messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query; // Get userId from query params
    
    const messages = await Message.find({ conversationId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    const conversation = await Conversation.findById(conversationId);
    const { isGroup } = conversation;

    // Mark conversation as read for this user if userId is provided
    if (userId) {
      await markConversationAsRead(conversationId, userId);
    }

    const resdata = {
      messages,
      isGroup
    };

    res.json(resdata);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching messages" });
  }
};

// Mark conversation as read for a user
const markConversationAsRead = async (conversationId, userId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    // Check if lastSeenBy exists and is an array
    if (!conversation.lastSeenBy || !Array.isArray(conversation.lastSeenBy)) {
      conversation.lastSeenBy = [];
    }

    const existingIndex = conversation.lastSeenBy.findIndex(
      entry => entry && entry.userId && entry.userId.toString() === userId.toString()
    );

    if (existingIndex !== -1) {
      conversation.lastSeenBy[existingIndex].lastSeen = new Date();
    } else {
      conversation.lastSeenBy.push({
        userId: userId,
        lastSeen: new Date()
      });
    }

    await conversation.save();

    // Update message statuses to 'read' for this conversation and user
    await Message.updateMany(
      {
        conversationId: conversationId,
        sender: { $ne: userId },
        status: { $in: ['sent', 'delivered'] }
      },
      { $set: { status: 'read' } }
    );
  } catch (err) {
    console.error("Error marking conversation as read:", err);
  }
};

// Helper function to get unread count
export const getUnreadCount = async (conversationId, userId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return 0;

    // If lastSeenBy doesn't exist or is empty, count all messages from others
    if (!conversation.lastSeenBy || !Array.isArray(conversation.lastSeenBy) || conversation.lastSeenBy.length === 0) {
      const unreadCount = await Message.countDocuments({
        conversationId: conversationId,
        sender: { $ne: userId },
        status: { $ne: 'read' }
      });
      return unreadCount;
    }

    const lastSeenEntry = conversation.lastSeenBy.find(
      entry => entry && entry.userId && entry.userId.toString() === userId.toString()
    );

    let query = {
      conversationId: conversationId,
      sender: { $ne: userId },
      status: { $ne: 'read' }
    };

    // If we have a lastSeenEntry, only count messages after that time
    if (lastSeenEntry && lastSeenEntry.lastSeen) {
      query.createdAt = { $gt: lastSeenEntry.lastSeen };
    }

    const unreadCount = await Message.countDocuments(query);
    return unreadCount;
  } catch (err) {
    console.error("Error getting unread count:", err);
    return 0;
  }
};

export const addMessage = async (req, res) => {
  try {
    // Extract data from form
    const { conversationId, senderId, text } = req.body;
    const file = req.file;
    
    // Validate required fields
    if (!conversationId || !senderId) {
      return res.status(400).json({ 
        error: "Missing required fields" 
      });
    }

    // Fetch conversation details
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Validate user is part of conversation
    const isParticipant = conversation.participants.some(p => 
      p.toString() === senderId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ 
        error: "User is not a participant in this conversation" 
      });
    }

    // Process attachments
    let attachments = [];
    let messageType = 'text';

    if (file) {
      attachments.push({
        fileName: file.originalname,
        fileUrl: file.filename,
        fileType: file.mimetype,
        fileSize: file.size
      });

      // Determine message type
      if (file.mimetype.startsWith('image/')) {
        messageType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        messageType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        messageType = 'audio';
      } else {
        messageType = 'file';
      }
    }

    // Create message
    const newMessage = new Message({
      conversationId,
      sender: senderId,
      text: text || "",
      messageType,
      attachments,
      status: 'sent'
    });

    await newMessage.save();

    // Populate sender info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username');

    // Update conversation's lastMessage and timestamp
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = Date.now();
    await conversation.save();

    // Prepare response data
    const responseData = {
      _id: populatedMessage._id,
      conversationId,
      isGroup: conversation.isGroup,
      sender: {
        _id: populatedMessage.sender._id,
        username: populatedMessage.sender.username
      },
      text: populatedMessage.text,
      messageType: populatedMessage.messageType,
      status: populatedMessage.status,
      attachments: populatedMessage.attachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize
      })),
      createdAt: populatedMessage.createdAt,
      updatedAt: populatedMessage.updatedAt
    };

    // Return response
    res.status(201).json(responseData);

  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ error: "Internal server error saving message" });
  }
};

// Endpoint to serve files
export const getSecureFile = async (req, res) => {
  try {
    const { messageId, fileName } = req.params;
    const { userId } = req.query;

    if (!fileName || !userId || !messageId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Find message by ID
    const message = await Message.findById(messageId).populate('conversationId');
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is part of the conversation
    const isParticipant = message.conversationId.participants.some(p => 
      p.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied" });
    }

    const filePath = path.resolve(`uploads/${fileName}`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Get file extension and set appropriate content-type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);

  } catch (err) {
    console.error("Error in getSecureFile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};