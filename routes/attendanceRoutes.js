const express = require("express");
const {
  punchIn,
  punchOut,
  signOut,
  getAttendanceByUser,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/punchIn", protect, punchIn);
router.post("/punchOut", protect, punchOut);
router.post("/signOut", protect, signOut);
router.get("/my-attendance", protect, getAttendanceByUser);

module.exports = router;
