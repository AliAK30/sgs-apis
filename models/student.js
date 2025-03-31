const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const {roles} = require("../config/roles.json")

const Student = new mongoose.Schema({
  student_id: { type: String, required: false },
  first_name: { type: String, required: true, minLength: 2 },
  last_name: { type: String, required: true, minLength: 2 },
  uni_name: { type: String, required: true },
  uni_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "University",
    required: true,
  },
  email: { type: String, required: true },
  role: { type: String, required: true, enum: roles },
  phone_number: { type: String },
  gender: { type: String },
  gpa: { type: Number },
  dob: { type: Date },
  questions: [{ q: { type: Number }, answer: { type: String } }],
  learning_style: {
    dim1: { name: String, score: Number },
    dim2: { name: String, score: Number },
    dim3: { name: String, score: Number },
    dim4: { name: String, score: Number },
  },
  picture: { type: String },
  newUser: { type: Boolean, default: true },
  isSurveyCompleted: { type: Boolean, default: false},
  privacy: {
    picture: {type: Number, default: 0},
    email: {type: Number, default: 0},
    phone_number: {type: Number, default: 0},
    gpa: {type: Number, default: 0},
    learning_style: {type: Number, default: 2},
  },
  push_notifications: {type: Boolean, default: true},
});

//0 means only me, 1 means friends only, 2 means everyone for privacy

// Create a partial index
Student.index(
  { student_id: 1 }, // Index on the `student_id` field 1 means ascending
  {
    unique: true, // Enforce uniqueness
    partialFilterExpression: { student_id: { $exists: true} }, // Only index documents where `student_id` exists and is not null
  }
);

// Middleware to remove time from the Date field
Student.pre("save", (next) => {
  if (this.dob) {
    // Setting the time to midnight (strip time part)
    this.dob = new Date(this.dob.setHours(0, 0, 0, 0));
  }
  next();
});

Student.plugin(passportLocalMongoose, { usernameField: "email" });

module.exports = mongoose.model("Student", Student);
