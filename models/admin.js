const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const Admin = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  uni_name: { type: String, required: true },
  uni_id: {type: mongoose.Schema.Types.ObjectId, ref:'University'},
  email: { type: String, required: true },
  role: { type: String, required: true },
  picture: { type: String },
});

Admin.plugin(passportLocalMongoose, {usernameField : "email"});

module.exports = mongoose.model("Admin", Admin);
