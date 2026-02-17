import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import {
  generateTokenPair,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserTokens,
  rotateRefreshToken,
  getUserActiveSessions,
  revokeSession,
} from "../utils/TokenUtil.js";
import {
  ErrorCodes,
  throwError,
  successResponse,
  asyncHandler,
} from "../utils/ErrorHandler.js";

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Add to your .env file
    pass: process.env.EMAIL_PASS, // Add to your .env file (use App Password for Gmail)
  },
});


/** 
 * Helper to extract client info
 */
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"] || "Unknown",
  };
};
  

/** 
 * Helper to generate session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(16).toString("hex");
};

/**
 * Helper to set refresh token cookie
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };

  res.cookie("refreshToken", refreshToken, cookieOptions);
};

/**
 * Helper to clear refresh token cookie
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};


export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
      fields: ["username", "email", "password"],
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throwError(ErrorCodes.VALIDATION_INVALID_EMAIL);
  }

  // Validate password strength
  if (password.length < 6) {
    throwError(ErrorCodes.VALIDATION_INVALID_PASSWORD, {
      requirement: "Password must be at least 6 characters",
    });
  }

  // Check if username exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    throwError(ErrorCodes.USER_USERNAME_EXISTS);
  }

  // Check if email exists
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throwError(ErrorCodes.USER_EMAIL_EXISTS);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
  });

  await newUser.save();

  res.status(201).json(
    successResponse(
      { userId: newUser._id },
      "User registered successfully"
    )
  );
});

/**
 * Login User
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
      fields: ["username", "password"],
    });
  }

  const user = await User.findOne({
    $or: [{ username }, { email: username }],
  });

  if (!user) {
    throwError(ErrorCodes.AUTH_INVALID_CREDENTIALS);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throwError(ErrorCodes.AUTH_INVALID_CREDENTIALS);
  }

  const sessionId = generateSessionId();
  const { ipAddress, userAgent } = getClientInfo(req);

  const { accessToken, refreshToken, expiresIn } =
    await generateTokenPair(
      user,
      sessionId,
      ipAddress,
      userAgent
    );

  setRefreshTokenCookie(res, refreshToken);

  res.json(
    successResponse(
      {
        accessToken,
        expiresIn,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      },
      "Login successful"
    )
  );
});

/**
 * Refresh Token
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    throwError(ErrorCodes.AUTH_REFRESH_TOKEN_INVALID);
  }

  const tokenData = await verifyRefreshToken(oldRefreshToken);

  const { ipAddress, userAgent } = getClientInfo(req);
  const sessionId = tokenData.sessionId;

  const { accessToken, refreshToken: newRefreshToken, expiresIn } =
    await generateTokenPair(
      tokenData.userId,
      sessionId,
      ipAddress,
      userAgent
    );

  await invalidateRefreshToken(oldRefreshToken);
  setRefreshTokenCookie(res, newRefreshToken);

  res.json(
    successResponse(
      {
        accessToken,
        expiresIn,
        user: {
          id: tokenData.userId._id,
          username: tokenData.userId.username,
          email: tokenData.userId.email,
        },
      },
      "Token refreshed successfully"
    )
  );
});

/**
 * Logout User
 */
export const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await invalidateRefreshToken(refreshToken);
  }

  clearRefreshTokenCookie(res);
  res.json(successResponse(null, "Logged out successfully"));
});

/**
 * Logout from all devices
 */
export const logoutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await invalidateAllUserTokens(userId);
  clearRefreshTokenCookie(res);

  res.json(
    successResponse(null, "Logged out from all devices successfully")
  );
});

/**
 * Get Active Sessions
 */
export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const sessions = await getUserActiveSessions(userId);

  res.json(
    successResponse(
      sessions.map((session) => ({
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastUsed: session.lastUsedAt,
        createdAt: session.createdAt,
      })),
      "Active sessions retrieved"
    )
  );
});

/**
 * Revoke specific session
 */
export const revokeUserSession = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.params;

  if (!sessionId) {
    throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
      fields: ["sessionId"],
    });
  }

  await revokeSession(userId, sessionId);
  res.json(successResponse(null, "Session revoked successfully"));
});

/**
 * Forgot Password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
      fields: ["email"],
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throwError(ErrorCodes.USER_NOT_FOUND, { email });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  const resetURL = `${process.env.FRONTEND_URL || "http://localhost"}/index.php/AuthController/resetPassword/${resetToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>Reset your password: <a href="${resetURL}">Reset</a></p>`,
  });

  res.json(successResponse(null, "Password reset link sent to your email"));
});

/**
 * Reset Password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
      fields: ["token", "newPassword"],
    });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throwError(ErrorCodes.AUTH_TOKEN_INVALID, {
      reason: "Reset token is invalid or expired",
    });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await invalidateAllUserTokens(user._id);

  res.json(successResponse(null, "Password reset successful"));
});

/**
 * Verify Reset Token
 */
export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.json({
      valid: false,
      error: "Invalid or expired reset token",
    });
  }

  res.json({ valid: true });
});

/**
 * Get all users for chat
 */
export const getAllUsersForChat = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const currentUser = await User.findById(userId);
  if (!currentUser) {
    throwError(ErrorCodes.USER_NOT_FOUND);
  }

  const users = await User.find({
    _id: { $ne: userId },
    isBot: { $ne: true },
  });

  res.json(successResponse({ users }));
});


export const getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find({
      _id: { $ne: userId },
      isBot: { $ne: true },
    })
      .select("username email avatar isOnline")
      .sort({ username: 1 });

    const formattedUsers = users.map((user) => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar:
        user.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`,
      isOnline: user.isOnline || false,
    }));

    res.json({ users: formattedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId, username, email, currentPassword, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throwError(ErrorCodes.USER_NOT_FOUND);
  }

  if (username && username !== user.username) {
    const existingUser = await User.findOne({
      username,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throwError(ErrorCodes.USER_USERNAME_EXISTS);
    }
  }

  if (email && email !== user.email) {
    const existingEmail = await User.findOne({
      email,
      _id: { $ne: userId },
    });
    if (existingEmail) {
      throwError(ErrorCodes.USER_EMAIL_EXISTS);
    }
  }

  if (newPassword || username || email) {
    if (!currentPassword) {
      throwError(ErrorCodes.VALIDATION_REQUIRED_FIELD, {
        fields: ["currentPassword"],
      });
    }

    const isValidPassword = bcrypt.compareSync(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      throwError(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }
  }

  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (newPassword) {
    updateData.password = bcrypt.hashSync(newPassword, 10);
  }

  await User.findByIdAndUpdate(userId, updateData);
  res.json(successResponse(null, "Profile updated successfully"));
});


export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, isOnline } = req.body;

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (isOnline !== undefined) {
      updates.isOnline = isOnline;
      updates.lastSeen = new Date();
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
    }).select("username email avatar status isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user status" });
  }
};


export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("username email");
  if (!user) {
    throwError(ErrorCodes.USER_NOT_FOUND);
  }

  res.json(successResponse({ user }));
});