import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken'
import path from 'path';
import fs from 'fs';

export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User saved successfully!" });
  } catch (err) {
    console.error("Error saving user:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid data format", details: err.message });
    }

    if (err.code === 11000) {
      // Duplicate key error (unique index violation)
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

    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return res.status(404).send({ error: "User doesn't exist!" });
    }

    const validPass = await bcrypt.compare(password, existingUser.password);
    if (!validPass) {
      return res.status(401).send({ error: "Incorrect password" });
    }
    const token = jwt.sign({ id: existingUser._id, username: existingUser.username }, "secret_key", { expiresIn: "1h" });

   res.json({ message: "Logged in successfully",token });
    
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
;

export const getAllUsersForChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const { excludeConversations = 'false' } = req.query;
    
    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get all users except current user
    const users = await User.find({ _id: { $ne: userId } })
      .select('username avatar status lastSeen isOnline')
      .sort({ 
        isOnline: -1,  // Online users first
        username: 1    // Then alphabetically
      });
    
    // Format response
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
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

// NEW FUNCTION: Get all users (simple version for group creation)
export const getAllUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all users except current user
    const users = await User.find({ _id: { $ne: userId } })
      .select('username avatar isOnline')
      .sort({ username: 1 });
    
    // Format response
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
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
    ).select('username avatar status isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user status" });
  }
};


// Your existing updateUserProfile function works perfectly
export const updateUserProfile = async (req, res) => {
    try {
        const { userId, username, currentPassword, newPassword } = req.body;
        
        // Get current user
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        // Check username
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ 
                username: username,
                _id: { $ne: userId }
            });
            
            if (existingUser) {
                return res.json({ success: false, error: 'Username already taken' });
            }
        }
        
        // Verify current password for any change
        if (newPassword || (username && username !== user.username)) {
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
    const user = await User.findById(userId).select("username");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error fetching user" });
  }
};
