const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const Superuser = new mongoose.Schema({
  username: { type: String, required: true },
  role: { type: String, required: true },
});

Superuser.plugin(passportLocalMongoose);

module.exports = mongoose.model("Superuser", Superuser);
