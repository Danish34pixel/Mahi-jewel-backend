const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  description: { type: String },
  images: [{ type: String }],
  stock: { type: Number, default: 0 },
});

module.exports =
  mongoose.models.Product || mongoose.model("Product", productSchema);
