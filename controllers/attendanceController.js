const Attendance = require("../models/attendance");
const User = require("../models/user");
const moment = require("moment");

// Helper: check if user has fully punched out
// const hasPunchedOut = async (userId) => {
//   const date = moment().format("YYYY-MM-DD");
//   const attendance = await Attendance.findOne({ userId, date });
//   const lastPunch = attendance?.punches?.slice(-1)[0];
//   return !!(lastPunch?.punchIn && lastPunch?.punchOut);
// };

// Punch In
exports.punchIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = moment().format("YYYY-MM-DD");

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const attendance = await Attendance.findOneAndUpdate(
      { userId, date },
      {
        $setOnInsert: {
          username: user.username,
          date,
          breaks: [],
          punches: [],
          workSeconds: 0,
          breakSeconds: 0,
        },
      },
      { upsert: true, new: true }
    );

    const lastPunch = attendance.punches[attendance.punches.length - 1];
    if (lastPunch && !lastPunch.punchOut) {
      return res
        .status(400)
        .json({ msg: "Already punched in and not yet punched out." });
    }

    attendance.punches.push({ punchIn: moment().format("hh:mm:ss A") });
    attendance.markModified("punches");
    await attendance.save();

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ msg: "Error in punchIn", error: error.message });
  }
};

// Punch Out
exports.punchOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workSeconds = 0, breakSeconds = 0 } = req.body || {};
    const date = moment().format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance)
      return res.status(400).json({ msg: "No punch-in record found" });

    const lastPunch = attendance.punches[attendance.punches.length - 1];
    if (!lastPunch || lastPunch.punchOut) {
      return res.status(400).json({ msg: "No ongoing punch session to end" });
    }

    lastPunch.punchOut = moment().format("hh:mm:ss A");
    attendance.workSeconds += workSeconds;
    attendance.breakSeconds += breakSeconds;

    attendance.markModified("punches");
    await attendance.save();

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ msg: "Error in punchOut", error: error.message });
  }
};

// // Break In
// exports.breakIn = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const date = moment().format("YYYY-MM-DD");

//     if (await hasPunchedOut(userId)) {
//       return res
//         .status(400)
//         .json({ msg: "You have already punched out today." });
//     }

//     const attendance = await Attendance.findOne({ userId, date });
//     if (!attendance)
//       return res.status(400).json({ msg: "You must punch in first" });

//     const lastBreak = attendance.breaks[attendance.breaks.length - 1];
//     if (lastBreak && !lastBreak.breakOut) {
//       return res.status(400).json({ msg: "Previous break is still ongoing" });
//     }

//     attendance.breaks.push({ breakIn: moment().format("hh:mm:ss A") });
//     attendance.markModified("breaks");
//     await attendance.save();

//     res.status(200).json(attendance);
//   } catch (error) {
//     res.status(500).json({ msg: "Error in breakIn", error: error.message });
//   }
// };

// Break Out
// exports.breakOut = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const date = moment().format("YYYY-MM-DD");

//     if (await hasPunchedOut(userId)) {
//       return res
//         .status(400)
//         .json({ msg: "You have already punched out today." });
//     }

//     const attendance = await Attendance.findOne({ userId, date });
//     if (!attendance || !attendance.breaks.length) {
//       return res.status(400).json({ msg: "No break found to end" });
//     }

//     const lastBreak = attendance.breaks[attendance.breaks.length - 1];
//     if (!lastBreak || lastBreak.breakOut) {
//       return res.status(400).json({ msg: "No ongoing break to end" });
//     }

//     lastBreak.breakOut = moment().format("hh:mm:ss A");
//     attendance.markModified("breaks");
//     await attendance.save();

//     res.status(200).json(attendance);
//   } catch (error) {
//     res.status(500).json({ msg: "Error in breakOut", error: error.message });
//   }
// };

// exports.updateTimers = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { workSeconds = 0, breakSeconds = 0 } = req.body;
//     const date = moment().format("YYYY-MM-DD");

//     const attendance = await Attendance.findOne({ userId, date });
//     if (!attendance) {
//       return res.status(404).json({ msg: "Attendance not found" });
//     }

//     attendance.workSeconds += workSeconds;
//     attendance.breakSeconds += breakSeconds;

//     await attendance.save();
//     res.status(200).json({ msg: "Timers updated successfully" });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ msg: "Error updating timers", error: error.message });
//   }
// };

// Get Attendance for Logged-in User
exports.getAttendanceByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await Attendance.find({ userId }).sort({ date: -1 });
    res.status(200).json(data);
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Error fetching attendance", error: error.message });
  }
};

// Get All Attendance (Admin)
// exports.getAllAttendance = async (req, res) => {
//   try {
//     const data = await Attendance.find()
//       .populate("userId", "username email role")
//       .sort({ date: -1 });
//     res.status(200).json(data);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ msg: "Error fetching all attendance", error: error.message });
//   }
// };
