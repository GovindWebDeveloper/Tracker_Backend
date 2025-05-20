const express = require("express");
const {
  punchIn,
  punchOut,
  breakIn,
  breakOut,
  getAttendanceByUser,
  getAllAttendance,
  updateTimers,
} = require("../controllers/attendanceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/punchIn", protect, punchIn);
router.post("/punchOut", protect, punchOut);
router.post("/breakIn", protect, breakIn);
router.post("/breakOut", protect, breakOut);
router.post("/updateTimers", protect, updateTimers);
router.get("/my-attendance", protect, getAttendanceByUser);
router.get("/all-attendance", protect, adminOnly, getAllAttendance);

module.exports = router;
