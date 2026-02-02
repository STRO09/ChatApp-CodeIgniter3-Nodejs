import aiConfig from '../config/ai.config.js';

const userTimestamps = new Map();

export const checkRateLimit = (userId) => {
  const { maxMessages, windowSeconds } = aiConfig.rateLimit;
  const now        = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  const timestamps = (userTimestamps.get(userId) || [])
    .filter(ts => ts > windowStart);

  if (timestamps.length >= maxMessages) {
    const retryAfterMs = timestamps[0] + (windowSeconds * 1000) - now;
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  timestamps.push(now);
  userTimestamps.set(userId, timestamps);
  return { allowed: true };
};