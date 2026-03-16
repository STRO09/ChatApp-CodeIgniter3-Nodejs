import jwt from "jsonwebtoken";
import crypto from "crypto";
import RefreshToken from "../models/RefreshToken.js";
import {
  ErrorCodes,
  AppError,
} from "./ErrorHandler.js";

// Token configuration
const JWT_SECRET =
  process.env.JWT_SECRET || "your_jwt_secret_key_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN =
  parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN) ||
  7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate JWT access token
 */
export const generateAccessToken = (user) => {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    isBot : user.isBot,
    type: "access",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Generate refresh token and store in database
 */
export const generateRefreshToken = async (
  userId,
  sessionId,
  ipAddress,
  userAgent
) => {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

  const refreshToken = await RefreshToken.create({
    token,
    userId,
    sessionId,
    expiresAt,
    ipAddress,
    userAgent,
    isValid: true,
  });

  return refreshToken.token;
};

/**
 * Verify JWT access token
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "access") {
      throw new AppError(ErrorCodes.AUTH_TOKEN_INVALID);
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError(ErrorCodes.AUTH_TOKEN_EXPIRED);
    }
    if (error.name === "JsonWebTokenError") {
      throw new AppError(ErrorCodes.AUTH_TOKEN_INVALID);
    }
    throw error;
  }
};

/**
 * Verify refresh token from database
 */
export const verifyRefreshToken = async (token) => {
  if (!token) {
    throw new AppError(ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
  }

  const refreshToken = await RefreshToken.findOne({
    token,
    isValid: true,
    expiresAt: { $gt: new Date() },
  }).populate("userId", "username email");

  if (!refreshToken) {
    throw new AppError(ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
  }

  refreshToken.lastUsedAt = new Date();
  await refreshToken.save();

  return refreshToken;
};

/**
 * Invalidate a specific refresh token
 */
export const invalidateRefreshToken = async (token) => {
  await RefreshToken.updateOne({ token }, { isValid: false });
};

/**
 * Invalidate all refresh tokens for a user
 */
export const invalidateAllUserTokens = async (userId) => {
  await RefreshToken.invalidateAllUserTokens(userId);
};

/**
 * Generate new token pair (access + refresh)
 */
export const generateTokenPair = async (
  user,
  sessionId,
  ipAddress,
  userAgent
) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(
    user._id,
    sessionId,
    ipAddress,
    userAgent
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN,
  };
};

/**
 * Rotate refresh token (invalidate old, create new)
 */
export const rotateRefreshToken = async (
  oldToken,
  userId,
  sessionId,
  ipAddress,
  userAgent
) => {
  await invalidateRefreshToken(oldToken);

  const newRefreshToken = await generateRefreshToken(
    userId,
    sessionId,
    ipAddress,
    userAgent
  );

  return newRefreshToken;
};

/**
 * Clean up expired tokens (cron job)
 */
export const cleanupExpiredTokens = async () => {
  const result = await RefreshToken.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { isValid: false }],
  });

  console.log(`Cleaned up ${result.deletedCount} expired/invalid tokens`);
  return result.deletedCount;
};

/**
 * Get active sessions for a user
 */
export const getUserActiveSessions = async (userId) => {
  return RefreshToken.find({
    userId,
    isValid: true,
    expiresAt: { $gt: new Date() },
  })
    .select("sessionId ipAddress userAgent lastUsedAt createdAt")
    .sort({ lastUsedAt: -1 });
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (userId, sessionId) => {
  return RefreshToken.updateMany(
    { userId, sessionId },
    { isValid: false }
  );
};
