const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    autopopulate: true,
  },
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
  arrivingInfo: { type: String },
  arrivingDate: { type: String },
});

OrderSchema.plugin(require("mongoose-autopopulate"));
module.exports = mongoose.model("Order", OrderSchema);
