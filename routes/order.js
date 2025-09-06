const express = require("express");
const router = express.Router();

// Dummy in-memory order store (replace with DB logic in production)
let orders = [];

// Place a new order
router.post("/", (req, res) => {
  const { userId, items, total, address } = req.body;
  if (!userId || !items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Missing or invalid order data" });
  const order = {
    _id: Date.now().toString(),
    userId,
    items,
    total,
    address,
    status: "placed",
    createdAt: new Date(),
  };
  orders.push(order);
  res.status(201).json(order);
});

// Get all orders for a user (supports /:userId for frontend compatibility)
router.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const userOrders = orders.filter((order) => order.userId === userId);
  // Always return 200 with array, even if empty
  res.status(200).json(userOrders);
});

// Get all orders (admin)
router.get("/", (req, res) => {
  res.json(orders);
});

module.exports = router;
