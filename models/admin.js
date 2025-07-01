const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const AdminSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  uni_name: { type: String, required: true },
  uni_id: {type: mongoose.Schema.Types.ObjectId, ref:'University'},
  email: { type: String, required: true },
  role: { type: String, required: true },
  picture: { type: String },
});

AdminSchema.plugin(passportLocalMongoose, {usernameField : "email"});

const Admin = mongoose.model("Admin", AdminSchema);
module.exports = Admin;
