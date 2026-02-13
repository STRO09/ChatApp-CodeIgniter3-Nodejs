import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// // Index for efficient cleanup of expired tokens
// refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// // Compound index for token validation queries
// refreshTokenSchema.index({ token: 1, isValid: 1, expiresAt: 1 });

// Method to check if token is valid
refreshTokenSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

// Static method to cleanup expired/invalid tokens for a user
refreshTokenSchema.statics.cleanupUserTokens = async function (userId) {
  return this.deleteMany({
    userId,
    $or: [{ isValid: false }, { expiresAt: { $lt: new Date() } }],
  });
};

// Static method to invalidate all tokens for a user (logout all devices)
refreshTokenSchema.statics.invalidateAllUserTokens = async function (userId) {
  return this.updateMany({ userId, isValid: true }, { isValid: false });
};

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;