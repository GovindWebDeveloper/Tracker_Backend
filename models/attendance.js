const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  username: { type: String },
  date: { type: String, required: true },
  punches: [
    {
      punchIn: { type: String },
      punchOut: { type: String },
    },
  ],
  signs: [
    {
      signOut: { type: String },
      signIn: { type: String },
    },
  ],
  workHours: { type: Number, default: 0 },
  breakHours: { type: Number, default: 0 },
  extraHoursToSkip: { type: Number, default: 0 },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
