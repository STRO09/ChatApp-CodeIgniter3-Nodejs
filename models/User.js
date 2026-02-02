import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  avatar: { type: String },
  status: { type: String, default: 'Hey there! I am using this app.' },
  lastSeen: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  isBot:    { type: Boolean, default: false }
}, {
  timestamps: true
});

const User = mongoose.model("User", userSchema);

export default User;