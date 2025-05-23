const express = require("express");
const { loginOrRegister } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/login", loginOrRegister);
router.get("/user-dashboard", protect, (req, res) => {
  res.send(`Welcome user: ${req.user.id}`);
});

router.get("/admin-panel", adminOnly, (res) => {
  res.send(`Welcome Admin`);
});
module.exports = router;
