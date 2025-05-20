const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  password: { type: String, required: true },
  userId: { type: String, required: true, unique: true },
  designation: { type: String },
  joiningDate: { type: String },
  file: { type: String },
  role: { type: String, default: "user" },
});

module.exports = mongoose.model("User", userSchema);