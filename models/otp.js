// models/OTP.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OTPSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    require: true
  }
});

module.exports = mongoose.model('OTP', OTPSchema);