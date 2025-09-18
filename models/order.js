// models/Order.js
const mongoose = require("mongoose");

const productSubSchema = new mongoose.Schema({
  _id: { type: String },
  name: String,
  price: Number,
  image: String,
  quantity: { type: Number, default: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, index: true },
    // Use ObjectId ref so we can populate easily
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // Keep legacy support for string user ids if you stored usernames as userId previously
    legacyUserIdString: { type: String, required: false },
    products: [productSubSchema],
    total: { type: Number, required: true },
    address: { type: String }, // optional order-specific address (guest checkout)
    // Snapshot fields stored at time of order placement
    username: { type: String, required: false },
    phone: { type: String, required: false },
    status: { type: String, default: "placed" },
    arrivingInfo: { type: String },
    arrivingDate: { type: String },
    // Payment details
    paymentMethod: {
      type: String,
      enum: ["COD", "online", "UPI", "CARD"],
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "not-applicable"],
      default: "not-applicable",
    },
  },
  { timestamps: true }
);

// Create sparse unique index on orderId to avoid collision with nulls
orderSchema.index({ orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Order", orderSchema);
