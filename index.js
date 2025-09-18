require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/product");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const placeholderRoutes = require("./routes/placeholder");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://mahi-jewel-frontend.vercel.app"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/placeholder", placeholderRoutes);

// Global error handler (captures Multer errors and others) and returns JSON so
// frontend receives the real failure reason instead of a generic 400.
app.use((err, req, res, next) => {
  console.error("Global error handler:", err && err.stack ? err.stack : err);
  if (err && err.name === "MulterError") {
    // Multer error codes like LIMIT_UNEXPECTED_FILE or LIMIT_FILE_SIZE
    return res.status(400).json({
      error: err.message,
      code: err.code,
      name: err.name,
    });
  }

  // For other errors, surface a helpful JSON response (avoid leaking secrets
  // in production; this is intended for debugging while you fix the create flow)
  return res.status(err && err.status ? err.status : 500).json({
    error: err && err.message ? err.message : "Server error",
    name: err && err.name ? err.name : undefined,
  });
});

mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    const mongo = process.env.MONGODB_URI || "(not set)";
    const masked = mongo.replace(
      /(mongodb\+srv:\/\/)(.*):(.*)@(.*)/,
      "$1<user>:<pass>@$4"
    );
    console.log("Connected to MongoDB URI:", masked);
    console.log(
      "Cloudinary configured:",
      !!(
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_CLOUD_NAME
      )
    );
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err));
