const mongoose = require("mongoose");

const University = mongoose.model(
  "University",
  new mongoose.Schema({
    name: {type: String, required: true},
    campus: {type: String, required: true},
    city: {type: String, required: true},
    country: {type: String, required: true},
  })
);
//owner: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
module.exports = University;
