const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "Student",
    required: true,
  },

  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: ["fr", "fr_accepted", "group_added"],
    required: true,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;

/* sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderRole'  // 👈 dynamic reference
  },
senderRole: {
    type: String,
    required: true,
    enum: ['Admin', 'Student'] // 👈 possible models
}, */


