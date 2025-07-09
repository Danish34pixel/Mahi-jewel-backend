const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  products: [
    {
      name: String,
      price: Number,
      image: String,
      _id: String,
    },
  ],
  total: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  orderId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  address: { type: String },
});

module.exports = mongoose.model("Order", OrderSchema);
