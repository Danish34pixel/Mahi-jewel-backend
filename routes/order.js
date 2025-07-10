const express = require("express");
const router = express.Router();
const Order = require("../models/order.js");

// Place a new order
router.post("/", async (req, res) => {
  try {
    const { userId, products, total, address } = req.body;
    const orderId = "ORD" + Date.now();

    // Accept products with or without image (for flexibility)
    const validProducts =
      Array.isArray(products) && products.every((p) => p && p.name && p.price);
    if (!validProducts) {
      return res.status(400).json({
        success: false,
        message: "Each product must have name and price fields.",
      });
    }

    const order = new Order({ userId, products, total, orderId, address });
    await order.save();
    res.status(201).json({
      success: true,
      order,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all orders for a user
router.get("/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    console.log(orders);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cancel order route (by orderId as fallback if not found by _id)
router.put("/cancel/:id", async (req, res) => {
  try {
    let order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "Cancelled" },
      { new: true }
    );
    // If not found by _id, try by orderId
    if (!order) {
      order = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { status: "Cancelled" },
        { new: true }
      );
    }
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all orders (admin)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// router.get("/orderadmin", async (req, res) => {
//   try {
//     const orders = await Order.find().sort({ createdAt: -1 });
//     console.log(orders);
//     res.json(orders);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// Update order status (admin)
router.put("/status/:id", async (req, res) => {
  try {
    const { status, arrivingInfo, arrivingDate } = req.body;
    const updateFields = { status };
    if (arrivingInfo !== undefined) updateFields.arrivingInfo = arrivingInfo;
    if (arrivingDate !== undefined) updateFields.arrivingDate = arrivingDate;

    let order = await Order.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
    });
    // If not found by _id, try by orderId
    if (!order) {
      order = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        updateFields,
        { new: true }
      );
    }
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete order route
router.delete("/:id", async (req, res) => {
  try {
    let order = await Order.findByIdAndDelete(req.params.id);
    // If not found by _id, try by orderId
    if (!order) {
      order = await Order.findOneAndDelete({ orderId: req.params.id });
    }
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
