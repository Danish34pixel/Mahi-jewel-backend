const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Delete user by id (admin)
router.delete("/users/:id", async (req, res) => {
  try {
    console.log("Delete request for user id:", req.params.id); // Debug log
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) {
      console.log("User not found for id:", id);
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (admin)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      {},
      "_id username email phone address createdAt"
    );
    console.log("All users:");
    users.forEach((u) =>
      console.log(`_id: ${u._id}, username: ${u.username}, email: ${u.email}`)
    );
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Signup route
router.post("/signup", async (req, res) => {
  try {
    console.log("Received signup body:", req.body); // Debug log
    const { username, email, password, phone, address } = req.body;
    // Add required fields validation
    if (!username || !email || !password || !phone || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
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
    // Ensure user._id is available and a string
    const userId = user._id ? user._id.toString() : undefined;

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Make sure to send both id and _id for compatibility
    const responseData = {
      message: "User registered successfully",
      token,
      user: {
        id: userId, // Always send as string
        _id: userId,
        username: user.username,
        email: user.email,
      },
    };

    console.log("Response data:", responseData); // Debug log
    res.status(201).json(responseData);
  } catch (err) {
    console.error("Signup error:", err); // Debug log
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
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
        id: user._id.toString(), // Always send as string
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
    };

    console.log("Login response data:", responseData); // Debug log
    res.status(200).json(responseData);
  } catch (err) {
    console.error("Login error:", err); // Debug log
    res.status(500).json({ message: "Server error" });
  }
});

// Admin check route
router.get("/is-admin", async (req, res) => {
  // Accept email and phone as query params or from token in production
  const { email, phone } = req.query;
  if (
    email === "Mahiijewels@gmail.com" &&
    (phone === "7987175226" || phone === 7987175226)
  ) {
    return res.json({ isAdmin: true });
  }
  return res.json({ isAdmin: false });
});

module.exports = router;
