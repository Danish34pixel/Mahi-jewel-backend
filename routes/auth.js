const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const upload = require("../upload");
const cloudinary = require("../cloudinary");

// Get all users (admin/debug)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log("/login route hit");
    console.log("Request body:", req.body);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    console.log("User found:", user);
    if (!user) {
      console.log("No user found for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);
    if (!isMatch) {
      console.log("Password does not match for user:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login user ID:", user._id.toString());

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
        phone: user.phone,
        address: user.address,
        age: user.age,
      },
    };

    console.log("Login response data:", responseData);
    res.status(200).json(responseData);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Signup route with image upload
router.post("/signup", upload.single("image"), async (req, res) => {
  try {
    console.log("/signup route hit");
    let { name, username, email, password, phone, address } = req.body;
    // Support frontend sending username instead of name
    if (!name && username) {
      name = username;
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    let imageUrl = "";
    if (req.file) {
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            if (!result || !result.secure_url)
              return reject(new Error("Cloudinary upload failed"));
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    // Only include fields that are present
    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,
      address,
    };
    if (typeof req.body.age !== "undefined") userData.age = req.body.age;
    if (typeof req.body.gender !== "undefined")
      userData.gender = req.body.gender;
    if (typeof req.body.paymentStatus !== "undefined")
      userData.paymentStatus = req.body.paymentStatus;
    if (typeof imageUrl !== "undefined") userData.image = imageUrl;
    const user = new User(userData);
    await user.save();
    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

// Admin check route
router.get("/is-admin", async (req, res) => {
  console.log("/is-admin route hit");
  // Accept email and phone as query params or from token in production
  const { email, phone } = req.query;
  console.log("Admin check for email:", email, "phone:", phone);
  if (
    email === "divyanshduttaroy163@gmail.com" &&
    (phone === "8989809903" || phone === 8989809903)
  ) {
    console.log("Admin verified for email:", email);
    return res.json({ isAdmin: true });
  }
  console.log("Not admin for email:", email);
  return res.json({ isAdmin: false });
});
