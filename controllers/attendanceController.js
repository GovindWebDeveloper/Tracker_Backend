const Attendance = require("../models/attendance");
const User = require("../models/user");
const moment = require("moment-timezone");

// Calculation Utility
function calculateWorkAndBreak(punches = [], signs = [], date) {
  let workMs = 0;
  let breakMs = 0;
  let extraMs = 0;

  // Use consistent format for parsing
  const timeFormat = "YYYY-MM-DD HH:mm:ss a";

  const validPunches = punches.filter((p) => p.punchIn && p.punchOut);
  validPunches.sort((a, b) =>
    moment(`${date} ${a.punchIn}`, timeFormat).diff(
      moment(`${date} ${b.punchIn}`, timeFormat)
    )
  );

  const validSigns = signs.filter((s) => s.signOut && s.signIn);
  validSigns.sort((a, b) =>
    moment(`${date} ${a.signOut}`, timeFormat).diff(
      moment(`${date} ${b.signIn}`, timeFormat)
    )
  );

  // Work time
  for (const p of validPunches) {
    const inTime = moment(`${date} ${p.punchIn}`, timeFormat);
    const outTime = moment(`${date} ${p.punchOut}`, timeFormat);
    if (outTime.isBefore(inTime)) outTime.add(1, "day");
    workMs += outTime.diff(inTime);
  }

  // Break time (gaps between punch sessions)
  for (let i = 0; i < validPunches.length - 1; i++) {
    const outTime = moment(`${date} ${validPunches[i].punchOut}`, timeFormat);
    const nextInTime = moment(
      `${date} ${validPunches[i + 1].punchIn}`,
      timeFormat
    );
    if (nextInTime.isBefore(outTime)) nextInTime.add(1, "day");
    const gap = nextInTime.diff(outTime);
    if (gap > 0) breakMs += gap;
  }

  // Extra time from signs
  for (const s of validSigns) {
    const outTime = moment(`${date} ${s.signOut}`, timeFormat);
    const inTime = moment(`${date} ${s.signIn}`, timeFormat);
    if (inTime.isBefore(outTime)) inTime.add(1, "day");
    extraMs += inTime.diff(outTime);
  }

  return { workMs, breakMs, extraMs };
}

// formatDuration function
function formatDuration(ms) {
  const duration = moment.duration(ms);
  return `${Math.floor(
    duration.asHours()
  )}h ${duration.minutes()}m ${duration.seconds()}s`;
}

//  Punch In
exports.punchIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    let attendance = await Attendance.findOneAndUpdate(
      { userId, date },
      {
        $setOnInsert: {
          username: user.username,
          date,
          punches: [],
          signs: [],
        },
      },
      { upsert: true, new: true }
    );

    const lastPunch = attendance.punches[attendance.punches.length - 1];
    if (lastPunch && !lastPunch.punchOut) {
      return res
        .status(400)
        .json({ msg: "Already punched in. Punch out first." });
    }

    // Use 24-hour format for all times
    const punchInTime = moment().tz("Asia/Kolkata").format("HH:mm:ss a");
    attendance.punches.push({
      punchIn: punchInTime,
      sessionActive: true,
    });

    // If there was a previous sign-out without a sign-in, start a new sign session
    const lastSign = attendance.signs[attendance.signs.length - 1];
    if (lastSign && lastSign.signOut && !lastSign.signIn) {
      lastSign.signIn = punchInTime;
      attendance.markModified("signs");
    }

    const { extraMs } = calculateWorkAndBreak(
      attendance.punches,
      attendance.signs,
      date
    );
    attendance.extraHoursToSkip = extraMs;

    attendance.markModified("punches");
    await attendance.save();

    res.status(200).json({ msg: "Punch In successful", attendance });
  } catch (error) {
    res.status(500).json({ msg: "Error in punchIn", error: error.message });
  }
};

//  Punch Out
exports.punchOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance)
      return res.status(400).json({ msg: "No punch-in record found" });

    const lastPunch = attendance.punches[attendance.punches.length - 1];
    if (!lastPunch || lastPunch.punchOut) {
      return res.status(400).json({ msg: "No active punch-in to punch out" });
    }

    lastPunch.punchOut = moment().tz("Asia/Kolkata").format("HH:mm:ss a");
    lastPunch.sessionActive = false;

    attendance.markModified("punches");

    const { workMs, breakMs } = calculateWorkAndBreak(
      attendance.punches,
      attendance.signs,
      date
    );
    attendance.workHours = workMs;
    attendance.breakHours = breakMs;

    await attendance.save();

    res.status(200).json({ msg: "Punch Out successful", attendance });
  } catch (error) {
    res.status(500).json({ msg: "Error in punchOut", error: error.message });
  }
};

exports.signOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = moment().format("YYYY-MM-DD");

    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance) {
      return res.status(400).json({ msg: "No attendance record found" });
    }

    const validPunches = attendance.punches.filter((p) => p.punchIn);
    if (validPunches.length === 0) {
      return res
        .status(400)
        .json({ msg: "You must punch in before signing out." });
    }
    const lastSign = attendance.signs[attendance.signs.length - 1];

    if (lastSign && !lastSign.signOut) {
      lastSign.signOut = moment().tz("Asia/Kolkata").format("HH:mm:ss a");
    } else {
      attendance.signs.push({
        signIn: null,
        signOut: moment().tz("Asia/Kolkata").format("HH:mm:ss a"),
      });
    }

    attendance.markModified("signs");
    await attendance.save();

    res.status(200).json({ msg: "Sign-out successful", attendance });
  } catch (error) {
    console.error("Error during signOut:", error);
    res.status(500).json({ msg: "Error in signOut", error: error.message });
  }
};

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

exports.getTotalWorkingHour = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || moment().format("YYYY-MM-DD");
    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance)
      return res.status(400).json({ msg: "No attendance found" });

    const { workMs } = calculateWorkAndBreak(
      attendance.punches,
      attendance.signs,
      date
    );
    attendance.workHours = workMs;
    await attendance.save();

    res.status(200).json({
      totalWorkTime: formatDuration(workMs),
      totalMilliseconds: workMs,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error calculating total working hour",
      error: error.message,
    });
  }
};

exports.getTotalBreakHour = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || moment().format("YYYY-MM-DD");
    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance)
      return res.status(400).json({ msg: "No attendance found" });

    const { breakMs } = calculateWorkAndBreak(
      attendance.punches,
      attendance.signs,
      date
    );
    attendance.breakHours = breakMs;
    await attendance.save();

    res.status(200).json({
      totalBreakTime: formatDuration(breakMs),
      totalMilliseconds: breakMs,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error calculating total break hour",
      error: error.message,
    });
  }
};

exports.getExtraHours = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || moment().format("YYYY-MM-DD");
    const attendance = await Attendance.findOne({ userId, date });
    if (!attendance)
      return res.status(400).json({ msg: "No attendance found" });

    const { extraMs } = calculateWorkAndBreak(
      attendance.punches,
      attendance.signs,
      date
    );
    attendance.extraHoursToSkip = extraMs;
    await attendance.save();

    res.status(200).json({
      totalWorkTime: formatDuration(extraMs),
      totalMilliseconds: extraMs,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error calculating total extra hour",
      error: error.message,
    });
  }
};
