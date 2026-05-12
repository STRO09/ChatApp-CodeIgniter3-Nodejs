import Message      from '../models/Messages.js';
import Conversation from '../models/Conversations.js';
import mongoose      from 'mongoose';
import aiConfig      from '../config/ai.config.js';
import { checkRateLimit }        from '../middleware/rateLimiter.js';
import { getStreamWithFallback } from '../providers/providerFactory.js';

function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

async function buildContext(conversationId) {
  const messages = await Message.find({ conversationId })
    .populate('sender', 'username isBot')
    .sort({ createdAt: -1 })
    .limit(aiConfig.context.maxContextMessages);

  messages.reverse();

  let tokenCount = 0;
  const context  = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg    = messages[i];
    const tokens = estimateTokens(msg.text);
    if (tokenCount + tokens > aiConfig.context.maxInputTokens) break;

    context.unshift({
      role:    msg.sender.isBot ? 'assistant' : 'user',
      content: msg.text || ''
    });
    tokenCount += tokens;
  }

  return context;
}

export const handleAiMessage = async (socket, io, data) => {
  const { userId, conversationId, text } = data;

  const rate = checkRateLimit(userId);
  if (!rate.allowed) {
    socket.emit('aiError', {
      conversationId,
      error: `Rate limited. Try again in ${rate.retryAfterSeconds}s.`
    });
    return;
  }

  try {
    const userMsg = await Message.create({
      conversationId,
      sender:      userId,
      text,
      messageType: 'text',
      status:      'sent'
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: userMsg._id,
      updatedAt:   new Date()
    });

    socket.emit('aiTyping', { conversationId });

    const context = await buildContext(conversationId);
    context.push({ role: 'user', content: text });

    const aiMessageId  = new mongoose.Types.ObjectId().toString();
    let   fullResponse = '';

    const stream = getStreamWithFallback({
      systemPrompt:    aiConfig.systemPrompt,
      messages:        context,
      maxOutputTokens: 1024
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
      socket.emit('aiStream', { conversationId, messageId: aiMessageId, chunk });
    }

    const botUser = await mongoose.model('User').findOne({ isBot: true });

    await Message.create({
      _id:         aiMessageId,
      conversationId,
      sender:      botUser._id,
      text:        fullResponse,
      messageType: 'text',
      status:      'sent'
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: aiMessageId,
      updatedAt:   new Date()
    });

    socket.emit('aiComplete', { conversationId, messageId: aiMessageId, fullText: fullResponse });

  } catch (err) {
    console.error('[AI] Error:', err.message);
    socket.emit('aiError', { conversationId, error: 'AI encountered an error. Please try again.' });
  }
};

export const getOrCreateAiConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const botUser     = await mongoose.model('User').findOne({ isBot: true });

    if (!botUser) {
      return res.status(500).json({ error: 'Bot not seeded. Check server startup.' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, botUser._id] },
      isGroup: false
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, botUser._id],
        roomName:     `ai_${userId}`,
        isGroup:      false
      });
    }

    res.json({ conversation });
  } catch (err) {
    console.error('[AI]', err);
    res.status(500).json({ error: 'Failed to get AI conversation' });
  }
};