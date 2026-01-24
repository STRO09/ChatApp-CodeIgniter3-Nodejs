import { Server } from 'socket.io';
import Conversation from '../models/Conversations.js';

// Store connected users with userId as key
const connectedUsers = new Map();

// Track which users are actively viewing which conversations
const activeConversations = new Map(); // Map<userId, conversationId>

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost", "http://127.0.0.1", "http://10.10.15.140", 'http://[::1]'],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', (userData) => {
      const { userId, username } = userData;
      
      // Store user with userId as key
      connectedUsers.set(userId, {
        userId,
        username,
        socketId: socket.id,
        status: 'online',
        joinedAt: new Date()
      });

      // Send updated user list to all clients
      io.emit('userListUpdate', Array.from(connectedUsers.values()));
      
      console.log(`${username} authenticated (ID: ${userId})`);
    });

    // Handle joining a room - UPDATED to track active conversations
    socket.on('joinRoom', (data) => {
      const { roomName, username, id: userId, conversationId } = data;
      
      if (roomName) {
        socket.join(roomName);
        
        // Track that this user is actively viewing this conversation
        if (conversationId) {
          activeConversations.set(userId, conversationId);
          console.log(`${username} is now actively viewing conversation ${conversationId}`);
        }
        
        console.log(`${username} joined room ${roomName}`);
      }
    });

    // NEW: Handle leaving a conversation (when user navigates away)
    socket.on('leaveConversation', (data) => {
      const { userId, conversationId } = data;
      
      if (activeConversations.get(userId) === conversationId) {
        activeConversations.delete(userId);
        console.log(`User ${userId} is no longer viewing conversation ${conversationId}`);
      }
    });

    // Handle chat messages - FIXED to prevent duplicates
    socket.on("chatRoom", async (data) => {
      try {
        const conversation = await Conversation.findById(data.conversationId)
          .populate('participants', '_id username');
        
        if (!conversation) {
          console.error("Conversation not found:", data.conversationId);
          return;
        }

        const messageData = {
          room: data.room,
          senderId: data.senderId,
          message: data.message,
          conversationId: data.conversationId,
          createdAt: new Date()
        };

        console.log(`Message in conversation ${data.conversationId} from ${data.senderId}`);

        // Send message to all participants individually (except sender)
        conversation.participants.forEach(participant => {
          if (participant._id.toString() !== data.senderId.toString()) {
            const userSocket = Array.from(connectedUsers.values()).find(
              u => u.userId === participant._id.toString()
            );
            
            if (userSocket) {
              // Check if this user is actively viewing this conversation
              const isActivelyViewing = activeConversations.get(participant._id.toString()) === data.conversationId;
              
              console.log(`Participant ${participant.username}: Online=${true}, ActivelyViewing=${isActivelyViewing}`);
              
              // Send to this participant's socket
              io.to(userSocket.socketId).emit('chatRoom', messageData);
            } else {
              console.log(`Participant ${participant.username}: Offline`);
            }
          }
        });

      } catch (err) {
        console.error("Error in chatRoom socket event:", err);
      }
    });

    // Handle user typing
    socket.on('typing', (data) => {
      socket.to(data.room).emit('userTyping', {
        username: data.username,
        isTyping: data.isTyping,
        room: data.room
      });
    });

    // Handle group typing
    socket.on('groupTyping', (data) => {
      socket.to(data.room).emit('groupTyping', {
        userId: data.userId,
        username: data.username,
        isTyping: data.isTyping,
        room: data.room
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      // Find and remove user by socketId
      let disconnectedUser = null;
      for (const [userId, user] of connectedUsers.entries()) {
        if (user.socketId === socket.id) {
          disconnectedUser = user;
          connectedUsers.delete(userId);
          
          // Remove from active conversations
          activeConversations.delete(userId);
          
          break;
        }
      }
      
      if (disconnectedUser) {
        console.log(`${disconnectedUser.username} disconnected`);
        
        // Notify all users
        io.emit('userListUpdate', Array.from(connectedUsers.values()));
      }
    });

    // Handle user logout
    socket.on('userLogout', (data) => {
      const { userId } = data;
      
      if (connectedUsers.has(userId)) {
        const user = connectedUsers.get(userId);
        console.log(`${user.username} logged out`);
        connectedUsers.delete(userId);
        activeConversations.delete(userId);
        io.emit('userListUpdate', Array.from(connectedUsers.values()));
      }
    });

    // Send current user list to newly connected client
    socket.emit('userListUpdate', Array.from(connectedUsers.values()));
  });

  return io;
};

export { io };

export const getConnectedUsers = () => {
  return new Map(connectedUsers);
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

export const getActiveConversations = () => {
  return new Map(activeConversations);
};