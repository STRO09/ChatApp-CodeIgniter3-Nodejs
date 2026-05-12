import mongoose from 'mongoose';
import User from './models/User.js';
import connectDB from './config/dbConnection.js';

async function checkBot() {
  await connectDB();
  const bot = await User.findOne({ isBot: true });
  if (bot) {
    console.log("Bot found:", bot.username, bot._id);
  } else {
    console.log("Bot NOT found. Seeding...");
    const newBot = await User.create({
      username: 'AI Assistant',
      email: 'ai@assistant.bot',
      password: 'ai-bot-secure-password',
      isBot: true,
      avatar: '/assets/images/ai-avatar.png'
    });
    console.log("Bot seeded:", newBot.username, newBot._id);
  }
  process.exit();
}

checkBot();
