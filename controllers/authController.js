const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.loginOrRegister = async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await User.findOne({ username });
    let isNewUser = false;

    if (!user) {
      // Register new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = new User({ username, password: hashedPassword, role: "user" });
      await user.save();
      isNewUser = true;
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      msg: isNewUser ? "Registered and logged in" : "Logged in successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
