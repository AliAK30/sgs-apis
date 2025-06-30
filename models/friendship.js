const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student", 
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'blocked'],
    default: 'pending'
  },
  isFavourite: {
    type:Boolean,
    default:false,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
});

// Prevent duplicate friendship requests, 1 means ascending
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Quick lookups for user's friendships
friendshipSchema.index({ requester: 1, status: 1 });
friendshipSchema.index({ recipient: 1, status: 1 });

const Friendship = mongoose.model("Friendship", friendshipSchema);

module.exports = Friendship;
