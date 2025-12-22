import Conversation from '../models/Conversations.js';
import Message from '../models/Messages.js';
import User from '../models/User.js';
import { getUnreadCount } from './messageController.js';

export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] },
      isGroup: false
    });

    if (!conversation) {
      // Create new conversation
      const roomName = `chat_${userId1}_${userId2}`;
      conversation = new Conversation({
        participants: [userId1, userId2],
        roomName,
        isGroup: false
      });
      await conversation.save();
      
      // Populate participants
      await conversation.populate('participants', 'username');
    }

    res.json({ conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching/creating conversation" });
  }
};

export const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Get both private and group conversations
    const conversations = await Conversation.find({ 
      participants: userId 
    })
    .populate('participants', 'username')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const unreadCount = await getUnreadCount(conv._id, userId);
          return {
            ...conv.toObject(),
            unreadCount
          };
        } catch (err) {
          console.error(`Error getting unread count for conversation ${conv._id}:`, err);
          return {
            ...conv.toObject(),
            unreadCount: 0
          };
        }
      })
    );

    res.json({ conversations: conversationsWithUnread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching user conversations" });
  }
};

export const findConversationBetweenUsers = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    const conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] },
      isGroup: false
    })
    .populate('participants', 'username');

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (err) {
    console.error("Error finding conversation:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Group chat functions
export const createGroupConversation = async (req, res) => {
  try {
    const { name, participants, admin } = req.body;
    
    if (!name || !participants || participants.length < 2) {
      return res.status(400).json({ 
        error: "Group name and at least 2 participants are required" 
      });
    }

    // Generate unique room name
    const roomName = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create group conversation
    const groupConversation = new Conversation({
      participants: [...participants, admin], // Include admin in participants
      roomName,
      isGroup: true,
      groupName: name,
      groupAdmin: admin,
      groupImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });

    await groupConversation.save();
    
    // Populate data
    await groupConversation.populate('participants', 'username');
    await groupConversation.populate('groupAdmin', 'username');

    res.status(201).json({
      success: true,
      conversation: groupConversation
    });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Error creating group conversation" });
  }
};

export const getGroupConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    const groups = await Conversation.find({
      isGroup: true,
      participants: userId
    })
    .populate('participants', 'username')
    .populate('groupAdmin', 'username')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    // Get unread count for each group
    const groupsWithUnread = await Promise.all(
      groups.map(async (group) => {
        try {
          const unreadCount = await getUnreadCount(group._id, userId);
          return {
            ...group.toObject(),
            unreadCount
          };
        } catch (err) {
          console.error(`Error getting unread count for group ${group._id}:`, err);
          return {
            ...group.toObject(),
            unreadCount: 0
          };
        }
      })
    );

    res.json({ groups: groupsWithUnread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching group conversations" });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.query;
    
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar status')
      .populate('groupAdmin', 'username')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get unread count for this conversation if userId is provided
    let unreadCount = 0;
    if (userId) {
      try {
        unreadCount = await getUnreadCount(conversationId, userId);
      } catch (err) {
        console.error(`Error getting unread count:`, err);
        unreadCount = 0;
      }
    }

    res.json({
      ...conversation.toObject(),
      unreadCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching conversation" });
  }
};

// Mark conversation as read
export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(p => 
      p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "User is not a participant" });
    }

    // Initialize lastSeenBy if it doesn't exist
    if (!conversation.lastSeenBy || !Array.isArray(conversation.lastSeenBy)) {
      conversation.lastSeenBy = [];
    }

    // Update last seen
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

    // Update message statuses to 'read'
    await Message.updateMany(
      {
        conversationId: conversationId,
        sender: { $ne: userId },
        status: { $in: ['sent', 'delivered'] }
      },
      { $set: { status: 'read' } }
    );

    res.json({ success: true, message: "Conversation marked as read" });
  } catch (err) {
    console.error("Error marking conversation as read:", err);
    res.status(500).json({ error: "Error marking conversation as read" });
  }
};

// Get unread counts for all conversations
export const getTotalUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Get all conversations for the user
    const conversations = await Conversation.find({ 
      participants: userId 
    });

    let totalUnread = 0;
    
    // Sum unread counts for all conversations
    for (const conv of conversations) {
      try {
        const unreadCount = await getUnreadCount(conv._id, userId);
        totalUnread += unreadCount;
      } catch (err) {
        console.error(`Error getting unread count for conversation ${conv._id}:`, err);
        // Continue with next conversation
      }
    }

    res.json({ totalUnread });
  } catch (err) {
    console.error("Error getting total unread count:", err);
    res.status(500).json({ error: "Error getting unread count" });
  }
};

export const addUserToGroup = async (req, res) => {
  try {
    const { conversationId, userName } = req.body;
    console.log("Request body:", req.body);

    // Find the group conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Find the user by username
    const user = await User.findOne({ username: userName });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already in participants
    if (!conversation.participants.some(p => p.toString() === user._id.toString())) {
      conversation.participants.push(user._id);
      await conversation.save();
    }

    // Populate participants for response
    await conversation.populate('participants', 'username');
    res.json({ success: true, conversation });
  } catch (err) {
    console.error("Error in addUserToGroup:", err);
    res.status(500).json({ error: "Error adding user to group" });
  }
};

export const removeUserFromGroup = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId.toString()
    );
    await conversation.save();

    await conversation.populate('participants', 'username');
    res.json({ success: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error removing user from group" });
  }
};

export const deleteGroupConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ error: "Group not found" });
    }

    await Conversation.findByIdAndDelete(conversationId);
    await Message.deleteMany({ conversationId });

    res.json({ success: true, message: "Group deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting group" });
  }
};