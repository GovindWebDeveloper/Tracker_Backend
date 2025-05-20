const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: String, required: true },
  punchIn: { type: String },
  punchOut: { type: String },
  breaks: [
    {
      breakIn: { type: String },
      breakOut: { type: String },
    },
  ],
  workSeconds: { type: Number },
  breakSeconds: { type: Number },
});

module.exports = mongoose.model("Attendance", attendanceSchema);