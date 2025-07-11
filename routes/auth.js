// Get all users (admin/debug)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login user ID:", user._id.toString()); // Debug log

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "365d", // 1 year
      }
    );

    // Make sure to send both id and _id for compatibility
    const responseData = {
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        phone: user.phone, // ADD THIS
      },
    };

    console.log("Login response data:", responseData); // Debug log
    res.status(200).json(responseData);
  } catch (err) {
    console.error("Login error:", err); // Debug log
    res.status(500).json({ message: "Server error" });
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, phone, address } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
    });
    await user.save();
    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// Admin check route
router.get("/is-admin", async (req, res) => {
  // Accept email and phone as query params or from token in production
  const { email, phone } = req.query;
  if (
    email === "divyanshduttaroy163@gmail.com" &&
    (phone === "8989809903" || phone === 8989809903)
  ) {
    return res.json({ isAdmin: true });
  }
  return res.json({ isAdmin: false });
});
