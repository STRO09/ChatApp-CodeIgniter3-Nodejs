import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  roomName: {
    type: String,
    required: true,
    unique: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupImage: {
    type: String,
    default: ''
  },
  lastSeenBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create indexes for faster queries
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ isGroup: 1, participants: 1 });

export default mongoose.model('Conversation', ConversationSchema);