import mongoose from 'mongoose';
import User from './models/User.js';
import Conversation from './models/Conversations.js';
import Message from './models/Messages.js';
import connectDB from './config/dbConnection.js';

import bcrypt from 'bcryptjs';

const SEED_USERS_COUNT = 150;
const SEED_CONVERSATIONS_COUNT = 500;
const SEED_MESSAGES_COUNT = 5000; // General random messages
const MASSIVE_CHAT_COUNT = 100000; // Targeted massive chat

async function seedData() {
  await connectDB();
  console.log("Starting massive data seeding...");

  // Clean up old performance data
  await User.deleteMany({ username: /^perf_user_/ });
  await Conversation.deleteMany({ roomName: /^perf_room_/ });
  // (Messages will be cleaned up implicitly if we use unique roomNames, 
  // but better to clean them by looking for messages from perf users if needed.
  // For now, unique roomNames will solve the index error.)
  console.log("Old performance data cleared.");

  // 1. Create Users
  console.log(`Creating ${SEED_USERS_COUNT} users...`);
  const hashedPassword = await bcrypt.hash("password123", 10);
  const users = [];
  for (let i = 0; i < SEED_USERS_COUNT; i++) {
    users.push({
      username: `perf_user_${i}`,
      email: `user_${i}@example.com`,
      password: hashedPassword,
    });
  }
  const createdUsers = await User.insertMany(users);
  console.log("Users created.");

  // 2. Create Conversations
  console.log(`Creating ${SEED_CONVERSATIONS_COUNT} conversations...`);
  const conversations = [];
  for (let i = 0; i < SEED_CONVERSATIONS_COUNT; i++) {
    const user1 = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const user2 = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    
    if (user1._id === user2._id) continue;

    conversations.push({
      participants: [user1._id, user2._id],
      roomName: `perf_room_${i}`,
      isGroup: false,
    });
  }
  const createdConvs = await Conversation.insertMany(conversations);
  console.log("Conversations created.");

  // 3. Create 25k+ Messages in chunks (for memory efficiency)
  console.log(`Injecting ${SEED_MESSAGES_COUNT} messages...`);
  const chunkSize = 2000;
  for (let i = 0; i < SEED_MESSAGES_COUNT; i += chunkSize) {
    const messages = [];
    for (let j = 0; j < chunkSize && (i + j) < SEED_MESSAGES_COUNT; j++) {
      const conv = createdConvs[Math.floor(Math.random() * createdConvs.length)];
      const sender = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      
      messages.push({
        conversationId: conv._id,
        sender: sender._id,
        text: `Performance test message number ${i + j}. Lorem ipsum dolor sit amet.`,
        status: 'read',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000))
      });
    }
    await Message.insertMany(messages);
    console.log(`Progress: ${i + chunkSize}/${SEED_MESSAGES_COUNT} messages...`);
  }
  
  // 4. Create Targeted Massive Chat (100k+ messages)
  const user1 = createdUsers.find(u => u.username === 'perf_user_1');
  const user2 = createdUsers.find(u => u.username === 'perf_user_91');
  
  if (user1 && user2) {
    console.log(`\nCreating MASSIVE chat (100k messages) between ${user1.username} and ${user2.username}...`);
    
    let massiveConv = await Conversation.findOne({
      participants: { $all: [user1._id, user2._id] },
      isGroup: false
    });
    
    if (!massiveConv) {
      massiveConv = await Conversation.create({
        participants: [user1._id, user2._id],
        roomName: `perf_room_massive`,
        isGroup: false
      });
    }
    
    const massiveChunkSize = 5000;
    for (let i = 0; i < MASSIVE_CHAT_COUNT; i += massiveChunkSize) {
      const messages = [];
      for (let j = 0; j < massiveChunkSize && (i + j) < MASSIVE_CHAT_COUNT; j++) {
        const sender = (i + j) % 2 === 0 ? user1 : user2;
        messages.push({
          conversationId: massiveConv._id,
          sender: sender._id,
          text: `Massive chat message #${i + j}. Testing performance and pagination.`,
          status: 'read',
          createdAt: new Date(Date.now() - (MASSIVE_CHAT_COUNT - (i + j)) * 1000) // Spaced by 1 second
        });
      }
      await Message.insertMany(messages);
      console.log(`Massive Progress: ${i + massiveChunkSize}/${MASSIVE_CHAT_COUNT} messages...`);
    }
  }

  console.log("✅ Seeding complete! Database is now at scale.");
  process.exit();
}

seedData().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
