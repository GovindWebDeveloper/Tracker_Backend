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
  // breaks: [
  //   {
  //     breakIn: { type: String },
  //     breakOut: { type: String },
  //   },
  // ],
  // workSeconds: { type: Number, default: 0 },
  // breakSeconds: { type: Number, default: 0 },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
