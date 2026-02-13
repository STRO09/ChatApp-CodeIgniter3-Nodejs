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


// Index for email + username lookups
userSchema.index({ email: 1, username: 1 });

// Virtual for full name if needed later
userSchema.virtual("displayName").get(function () {
  return this.username;
});

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar:
      this.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(this.username)}&background=random`,
    status: this.status,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
  };
};

// Method to check if password reset token is valid
userSchema.methods.isResetTokenValid = function () {
  return (
    this.resetPasswordToken &&
    this.resetPasswordExpires &&
    this.resetPasswordExpires > Date.now()
  );
};

const User = mongoose.model("User", userSchema);

export default User;