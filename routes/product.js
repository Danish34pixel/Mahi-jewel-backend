const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Get a single product by id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new product
// For file uploads and ImageKit
const ImageKit = require("imagekit");
const upload = require("../upload");

const imagekit = new ImageKit({
  publicKey: "public_+W6nXvLsXllXAcnu1gQ9853qajI=",
  privateKey: "private_Mefu/8IHUj854PsJqLSF1QQUHzI=",
  urlEndpoint: "https://ik.imagekit.io/DanishKhan",
});

// Add a new product with at least 5 images (uploaded to ImageKit)
router.post("/add", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length < 5) {
      return res
        .status(400)
        .json({ message: "Please upload at least 5 images." });
    }
    const { name, price, description, category } = req.body;
    let imageUrls = [];

    for (let file of req.files) {
      const result = await imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
      });
      imageUrls.push(result.url);
    }

    const product = new Product({
      name,
      price,
      images: imageUrls,
      description,
      category,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
