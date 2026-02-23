import { verifyAccessToken } from "../utils/TokenUtil.js";
import { ErrorCodes, throwError } from "../utils/ErrorHandler.js";
import User from "../models/User.js";

/**
 * Middleware to verify JWT access token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throwError(ErrorCodes.AUTH_TOKEN_MISSING);
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth, just continue
    next();
  }
};

/**
 * Middleware to verify user exists in database
 */
export const verifyUserExists = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw createAuthError(ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      throw createAuthError(ErrorCodes.USER_NOT_FOUND);
    }

    // Attach full user object to request
    req.userObject = user;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined middleware: authenticate and verify user
 */
export const authenticateAndVerifyUser = [authenticateToken, verifyUserExists];