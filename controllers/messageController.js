import Message from '../models/Messages.js';
import Conversation from '../models/Conversations.js';
import path from 'path';
import fs from 'fs';

// Get all messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, limit = 50, before } = req.query;
    
    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username')
      .sort({ createdAt: -1 }) // Get newest first
      .limit(parseInt(limit));

    // Return in chronological order (oldest first for UI)
    messages.reverse();

    const conversation = await Conversation.findById(conversationId);
    const { isGroup } = conversation;

    // Mark conversation as read for this user if userId is provided
    if (userId) {
      markConversationAsRead(conversationId, userId).catch(err => 
        console.error("Async markAsRead failed:", err)
      );
    }

    const resdata = {
      messages,
      isGroup,
      hasMore: messages.length === parseInt(limit)
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

    // Initialize lastSeenBy if needed
    if (!conversation.lastSeenBy || !Array.isArray(conversation.lastSeenBy)) {
      conversation.lastSeenBy = [];
    }

    const existingIndex = conversation.lastSeenBy.findIndex(
      entry => entry && entry.userId && entry.userId.toString() === userId.toString()
    );

    const currentTime = new Date();

    if (existingIndex !== -1) {
      conversation.lastSeenBy[existingIndex].lastSeen = currentTime;
    } else {
      conversation.lastSeenBy.push({
        userId: userId,
        lastSeen: currentTime
      });
    }

    await conversation.save();

    // Update message statuses to 'read'
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

// FIXED: Get unread count for a conversation
export const getUnreadCount = async (conversationId, userId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      console.log(`[UNREAD] Conversation ${conversationId} not found`);
      return 0;
    }

    // Find user's last seen timestamp
    let lastSeenTime = null;
    
    if (conversation.lastSeenBy && Array.isArray(conversation.lastSeenBy)) {
      const lastSeenEntry = conversation.lastSeenBy.find(
        entry => entry && entry.userId && entry.userId.toString() === userId.toString()
      );

      if (lastSeenEntry && lastSeenEntry.lastSeen) {
        lastSeenTime = lastSeenEntry.lastSeen;
      }
    }

    // Build query
    const query = {
      conversationId: conversationId,
      sender: { $ne: userId }
    };

    if (lastSeenTime) {
      // User has opened this conversation before
      // Count messages created AFTER their last seen time
      query.createdAt = { $gt: lastSeenTime };
    } else {
      // User has NEVER opened this conversation
      // Count all unread messages from others
      query.status = { $ne: 'read' };
      console.log(`[UNREAD] User ${userId} has never opened conversation ${conversationId}`);
    }

    const unreadCount = await Message.countDocuments(query);
    
    console.log(`[UNREAD] Final count for conversation ${conversationId}, user ${userId}: ${unreadCount} messages`);
    
    return unreadCount;
  } catch (err) {
    console.error("[UNREAD] Error getting unread count:", err);
    return 0;
  }
};

export const saveMessageInternal = async ({ conversationId, senderId, text, file }) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const isParticipant = conversation.participants.some(p => 
    p.toString() === senderId.toString()
  );
  if (!isParticipant) {
    throw new Error("User is not a participant in this conversation");
  }

  // Process attachments
  let attachments = [];
  let messageType = 'text';

  if (file) {
    attachments.push({
      fileName: file.originalname || file.filename,
      fileUrl: file.filename,
      fileType: file.mimetype,
      fileSize: file.size
    });

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

  // Create message with 'sent' status
  const newMessage = new Message({
    conversationId,
    sender: senderId,
    text: text || "",
    messageType,
    attachments,
    status: 'sent'
  });

  await newMessage.save();

  const populatedMessage = await Message.findById(newMessage._id)
    .populate('sender', 'username');

  // Update conversation
  conversation.lastMessage = newMessage._id;
  conversation.updatedAt = Date.now();
  await conversation.save();

  return {
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
};

export const addMessage = async (req, res) => {
  try {
    const { conversationId, senderId, text } = req.body;
    const file = req.file;
    
    if (!conversationId || !senderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const responseData = await saveMessageInternal({ conversationId, senderId, text, file });
    res.status(201).json(responseData);

  } catch (err) {
    console.error("Error saving message:", err.message);
    if (err.message === "Conversation not found") {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === "User is not a participant in this conversation") {
      return res.status(403).json({ error: err.message });
    }
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

    const message = await Message.findById(messageId).populate('conversationId');
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

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

/**
 * Optimized helper to get unread counts for multiple conversations in a single DB query
 * Resolves the N+1 problem.
 */
export const getBulkUnreadCounts = async (conversations, userId) => {
  try {
    if (!conversations || conversations.length === 0) return {};

    const orQueries = conversations.map(conv => {
      let lastSeenTime = null;
      const lastSeenBy = conv.lastSeenBy || [];
      
      if (Array.isArray(lastSeenBy)) {
        const entry = lastSeenBy.find(e => 
          e && e.userId && e.userId.toString() === userId.toString()
        );
        if (entry && entry.lastSeen) {
          lastSeenTime = entry.lastSeen;
        }
      }

      const query = {
        conversationId: conv._id,
        sender: { $ne: userId }
      };

      if (lastSeenTime) {
        query.createdAt = { $gt: lastSeenTime };
      } else {
        query.status = { $ne: 'read' };
      }
      return query;
    });

    const results = await Message.aggregate([
      { $match: { $or: orQueries } },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } }
    ]);

    const countsMap = {};
    results.forEach(res => {
      countsMap[res._id.toString()] = res.count;
    });

    return countsMap;
  } catch (err) {
    console.error("[UNREAD_BULK] Error getting bulk unread counts:", err);
    return {};
  }
};