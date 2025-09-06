const express = require("express");
const router = express.Router();

// Dummy in-memory cart store (replace with DB logic in production)
let carts = {};

// Get cart for a user
router.get("/", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  res.json(carts[userId] || []);
});

// Add item to cart
router.post("/", (req, res) => {
  const { userId, product, quantity } = req.body;
  if (!userId || !product)
    return res.status(400).json({ error: "Missing userId or product" });
  if (!carts[userId]) carts[userId] = [];
  const existing = carts[userId].find((item) => item._id === product._id);
  if (existing) {
    existing.quantity += quantity || 1;
  } else {
    carts[userId].push({ ...product, quantity: quantity || 1 });
  }
  res.json(carts[userId]);
});

// Update quantity
router.put("/:itemId", (req, res) => {
  const { userId } = req.query;
  const { quantity } = req.body;
  const { itemId } = req.params;
  if (!userId || !itemId)
    return res.status(400).json({ error: "Missing userId or itemId" });
  if (!carts[userId]) return res.status(404).json({ error: "Cart not found" });
  const item = carts[userId].find((item) => item._id === itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });
  item.quantity = quantity;
  res.json(item);
});

// Remove item from cart
router.delete("/:itemId", (req, res) => {
  const { userId } = req.query;
  const { itemId } = req.params;
  if (!userId || !itemId)
    return res.status(400).json({ error: "Missing userId or itemId" });
  if (!carts[userId]) return res.status(404).json({ error: "Cart not found" });
  carts[userId] = carts[userId].filter((item) => item._id !== itemId);
  res.status(204).end();
});

module.exports = router;
