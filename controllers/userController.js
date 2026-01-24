import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER, // Add to your .env file
    pass: process.env.EMAIL_PASS  // Add to your .env file (use App Password for Gmail)
  }
});

// Register User
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("Error saving user:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid data format", details: err.message });
    }

    if (err.code === 11000) {
      return res.status(409).json({ error: "Duplicate entry detected" });
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).send({ error: "Username and password are required" });
    }

    // Find user by username or email
    const existingUser = await User.findOne({
      $or: [{ username: username }, { email: username }]
    });

    if (!existingUser) {
      return res.status(404).send({ error: "User doesn't exist!" });
    }

    const validPass = await bcrypt.compare(password, existingUser.password);
    if (!validPass) {
      return res.status(401).send({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { 
        id: existingUser._id, 
        username: existingUser.username,
        email: existingUser.email 
      }, 
      "secret_key", 
      { expiresIn: "1h" }
    );

    res.json({ message: "Logged in successfully", token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// Forgot Password - Generate reset token and send email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "No account found with that email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost'}/AuthController/resetPassword/${resetToken}`;

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("Error in forgot password:", err);
    res.status(500).json({ error: "Error sending reset email" });
  }
};

// Reset Password - Verify token and update password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Update password
    user.password = bcrypt.hashSync(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Error resetting password" });
  }
};

// Verify Reset Token
export const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ valid: false, error: "Invalid or expired reset token" });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(500).json({ valid: false, error: "Error verifying token" });
  }
};

export const getAllUsersForChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const { excludeConversations = 'false' } = req.query;
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const users = await User.find({ _id: { $ne: userId } })
      .select('username email avatar status lastSeen isOnline')
      .sort({ 
        isOnline: -1,
        username: 1
      });
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`,
      status: user.status,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    }));
    
    res.json({ users: formattedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const users = await User.find({ _id: { $ne: userId } })
      .select('username email avatar isOnline')
      .sort({ username: 1 });
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`,
      isOnline: user.isOnline || false
    }));
    
    res.json({ users: formattedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
};

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
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select('username email avatar status isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user status" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId, username, email, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    // Check username uniqueness
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ 
        username: username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.json({ success: false, error: 'Username already taken' });
      }
    }

    // Check email uniqueness
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: email,
        _id: { $ne: userId }
      });
      
      if (existingEmail) {
        return res.json({ success: false, error: 'Email already in use' });
      }
    }
    
    // Verify current password for any change
    if (newPassword || (username && username !== user.username) || (email && email !== user.email)) {
      if (!currentPassword) {
        return res.json({ success: false, error: 'Current password required' });
      }
      
      const isValidPassword = bcrypt.compareSync(currentPassword, user.password);
      if (!isValidPassword) {
        return res.json({ success: false, error: 'Current password incorrect' });
      }
    }
    
    // Update data
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (newPassword) {
      updateData.password = bcrypt.hashSync(newPassword, 10);
    }
    
    await User.findByIdAndUpdate(userId, updateData);
    
    res.json({ 
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("username email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error fetching user" });
  }
};