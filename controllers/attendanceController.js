const Attendance = require("../models/attendance");
const moment = require("moment");

const hasPunchedOut = async (userId) => {
  const date = moment().format("DD-MM-YYYY");
  const attendance = await Attendance.findOne({ userId, date });
  return attendance?.punchOut ? true : false;
};

exports.punchIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = moment().format("DD-MM-YYYY");

    if (await hasPunchedOut(userId)) {
      return res.status(400).json({ msg: "Already punched out today." });
    }

    const alreadyPunched = await Attendance.findOne({ userId, date });
    if (alreadyPunched?.punchIn) {
      return res.status(400).json({ msg: "Already punched in today." });
    }

    const attendance = await Attendance.findOneAndUpdate(
      { userId, date },
      {
        $set: { punchIn: moment().format("HH:mm:ss") },
        $setOnInsert: { breaks: [] },
      },
      { upsert: true, new: true }
    );

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ msg: "Error in punchIn", error });
  }
};

exports.updateTimers = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workSeconds, breakSeconds } = req.body;
    const date = moment().format("DD-MM-YYYY");

    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance) {
      return res.status(404).json({ msg: "Attendance not found" });
    }

    attendance.workSeconds = workSeconds;
    attendance.breakSeconds = breakSeconds;

    await attendance.save();
    res.status(200).json({ msg: "Timers updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Error updating timers", error });
  }
};

exports.punchOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workSeconds, breakSeconds } = req.body;
    const date = moment().format("DD-MM-YYYY");

    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance) return res.status(404).json({ msg: "Punch in first" });
    if (attendance.punchOut)
      return res.status(400).json({ msg: "Already punched out" });

    attendance.punchOut = moment().format("HH:mm:ss");
    attendance.workSeconds = workSeconds;
    attendance.breakSeconds = breakSeconds;

    await attendance.save();
    res.status(200).json(attendance);
  } catch (error) {
    console.error("Punch Out Error:", error);
    res.status(500).json({ msg: "Error in punchOut", error:error.message });
  }
};

exports.breakIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = moment().format("DD-MM-YYYY");

    if (await hasPunchedOut(userId)) {
      return res.status(400).json({ msg: "Already punched out today." });
    }

    let attendance = await Attendance.findOne({ userId, date });
    if (!attendance) return res.status(400).json({ msg: "Punch in first" });

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak && !lastBreak.breakOut) {
      return res.status(400).json({ msg: "Previous break not ended" });
    }

    attendance.breaks.push({ breakIn: moment().format("HH:mm:ss") });
    await attendance.save();

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ msg: "Error in breakIn", error });
  }
};

exports.breakOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = moment().format("DD-MM-YYYY");

    if (await hasPunchedOut(userId)) {
      return res.status(400).json({ msg: "Already punched out today." });
    }

    let attendance = await Attendance.findOne({ userId, date });
    if (!attendance || attendance.breaks.length === 0) {
      return res.status(400).json({ msg: "No break to end" });
    }

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (lastBreak.breakOut) {
      return res.status(400).json({ msg: "No ongoing break found" });
    }

    lastBreak.breakOut = moment().format("HH:mm:ss");
    await attendance.save();

    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ msg: "Error in breakOut", error });
  }
};

exports.getAttendanceByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = await Attendance.find({ userId }).sort({ date: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ msg: "Error in getAttendanceByUser", error });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const data = await Attendance.find()
      .populate("userId", "name email department designation")
      .sort({ date: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ msg: "Error in getAllAttendance", error });
  }
};
