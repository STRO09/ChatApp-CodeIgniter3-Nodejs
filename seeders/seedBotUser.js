import User from '../models/User.js';

export const seedBotUser = async () => {
  const existing = await User.findOne({ isBot: true });

  if (existing) {
    console.log('[SEED] Bot user already exists — ID:', existing._id.toString());
    return existing;
  }

  const bot = await User.create({
    username: 'AI Assistant',
    email:    'ai-bot@system.local',
    password: 'bot_no_login_' + Date.now(),
    isBot:    true,
    avatar:   '/assets/images/ai-avatar.png'
  });

  console.log('[SEED] Created bot user — ID:', bot._id.toString());
  return bot;
};