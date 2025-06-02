const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minLength: 2,
  },
  uni_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    required: true,
  },
  uni_name: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["any", "male", "female"],
    default: "any",
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  dim1: {
    name: { type: String, enum: ["any", "active", "reflective"] },
    preference: {
      type: String,
      enum: ["balanced", "weak", "moderate", "strong"],
    },
  },
  dim2: {
    name: { type: String, enum: ["any", "sensing", "intuitive"] },
    preference: {
      type: String,
      enum: ["balanced", "weak", "moderate", "strong"],
    },
  },
  dim3: {
    name: { type: String, enum: ["any", "visual", "verbal"] },
    preference: {
      type: String,
      enum: ["balanced", "weak", "moderate", "strong"],
    },
  },
  dim4: {
    name: { type: String, enum: ["any", "global", "sequential"] },
    preference: {
      type: String,
      enum: ["balanced", "weak", "moderate", "strong"],
    },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

/* dimensions:

balanced: 0
weak: 1-3
moderate: 4-7
strong: 8-11 */

groupSchema.pre("save", function (next) {
  if (this.name) {
    this.name =
      this.name.trim().charAt(0).toUpperCase() + this.name.trim().slice(1);
  }
  next();
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
