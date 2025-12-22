import { Server } from 'socket.io';
import Conversation from '../models/Conversations.js';

// Store connected users with userId as key
const connectedUsers = new Map();
let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost", "http://127.0.0.1", "http://10.10.15.140"],
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

    // Handle joining a room
    socket.on('joinRoom', (data) => {
      const { roomName, username, id: userId } = data;
      
      if (roomName) {
        socket.join(roomName);
        console.log(`${username} joined room ${roomName}`);
      }
    });

    // Handle chat messages - UPDATED to include conversationId
    socket.on("chatRoom", async (data) => {
      console.log("Socket received message:", data);
      
      // Get conversation to find all participants
      try {
        const conversation = await Conversation.findById(data.conversationId)
          .populate('participants', '_id');
        
        if (conversation) {
          // Emit to room (for users currently in the chat)
          const messageData = {
            room: data.room,
            senderId: data.senderId,
            message: data.message,
            createdAt: new Date()
          };

          io.to(data.room).emit('chatRoom', messageData);
          
          // Also emit to all participants individually to ensure they get the notification
          // This ensures users not in the room still get real-time updates
          conversation.participants.forEach(participant => {
            if (participant._id.toString() !== data.senderId.toString()) {
              const userSocket = Array.from(connectedUsers.values()).find(
                u => u.userId === participant._id.toString()
              );
              
              if (userSocket) {
                io.to(userSocket.socketId).emit('chatRoom', {
                  ...messageData,
                  // Add conversationId to help frontend identify which conversation
                  conversationId: data.conversationId
                });
              }
            }
          });
        }
      } catch (err) {
        console.error("Error in chatRoom socket event:", err);
        
        // Fallback: just emit to the room
        const messageData = {
          room: data.room,
          senderId: data.senderId,
          message: data.message,
          createdAt: new Date()
        };
        
        io.to(data.room).emit('chatRoom', messageData);
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