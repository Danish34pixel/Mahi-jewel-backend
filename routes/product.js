const express = require("express");
const router = express.Router();
const upload = require("../upload"); // memoryStorage multer
const Product = require("../models/Product");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../cloudinary");

const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    console.log("Create product request body:", req.body);
    console.log(
      "Create product files count:",
      req.files ? req.files.length : 0
    );
    if (req.files && req.files[0])
      console.log(
        "first file buffer length:",
        req.files[0].buffer ? req.files[0].buffer.length : "no-buffer"
      );

    // debug endpoint to inspect parsed body/files quickly
    if (req.query && req.query.debug === "1") {
      return res.json({
        message: "debug",
        body: req.body,
        filesCount: req.files ? req.files.length : 0,
        files: req.files
          ? req.files.map((f) => ({
              originalname: f.originalname,
              size: f.size,
              path: f.path || null,
            }))
          : [],
      });
    }

    const { name, price, description, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" });
    }
    if (!req.files || req.files.length !== 5) {
      return res.status(400).json({ error: "Exactly 5 images are required" });
    }

    // Build image URLs from disk-saved files (uploads/) so product creation
    // works without Cloudinary while debugging. Files are served at /uploads.
    const images = [];
    const host = req.get("host");
    const protocol = req.protocol;

    for (const file of req.files) {
      try {
        if (hasCloudinary) {
          // Upload to Cloudinary from disk path and then delete local file.
          const uploadResult = await cloudinary.uploader.upload(file.path, {
            resource_type: "image",
          });
          if (uploadResult && uploadResult.secure_url) {
            images.push(uploadResult.secure_url);
          } else {
            // fallback to local URL if Cloudinary didn't return url
            const relPath = path.relative(path.join(__dirname, ".."), file.path);
            images.push(`${protocol}://${req.headers.host}/${relPath.replace(/\\\\/g, "/")}`);
          }

          // remove local file (ignore errors)
          fs.unlink(file.path, (err) => err && console.warn("Failed to unlink", file.path, err));
        } else {
          const relPath = path.relative(path.join(__dirname, ".."), file.path);
          images.push(`${protocol}://${req.headers.host}/${relPath.replace(/\\\\/g, "/")}`);
        }
      } catch (fileErr) {
        console.error("Image processing/upload failed for", file.originalname, fileErr);
        return res.status(400).json({ error: "Failed to upload/process image", file: file.originalname, details: fileErr && fileErr.message });
      }
    }

    const product = new Product({
      name,
      price: Number(price),
      description: description || "",
      category: category || "",
      images,
    });

    await product.save();
    return res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
