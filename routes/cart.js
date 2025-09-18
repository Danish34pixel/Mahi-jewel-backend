const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

// Dummy in-memory cart store (replace with DB logic in production)
let carts = {};

// Helper: resolve userId from verified token only.
// We intentionally do NOT fall back to client-supplied userId to prevent
// unauthenticated requests from impersonating another user.
function resolveUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  return null;
}

// Get cart for authenticated user
router.get("/", auth, (req, res) => {
  const userId = resolveUserId(req);
  if (!userId)
    return res.status(401).json({ error: "Authentication required" });
  res.json(carts[userId] || []);
});

// Add item to cart
router.post("/", auth, (req, res) => {
  const userId = resolveUserId(req);
  const { product, quantity } = req.body;
  if (!userId)
    return res.status(401).json({ error: "Authentication required" });
  if (!product) return res.status(400).json({ error: "Missing product" });
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
router.put("/:itemId", auth, (req, res) => {
  const userId = resolveUserId(req);
  const { quantity } = req.body;
  const { itemId } = req.params;
  if (!userId || !itemId)
    return res
      .status(401)
      .json({ error: "Authentication required or missing itemId" });
  if (!carts[userId]) return res.status(404).json({ error: "Cart not found" });
  const item = carts[userId].find((item) => item._id === itemId);
  if (!item) return res.status(404).json({ error: "Item not found" });
  item.quantity = quantity;
  res.json(item);
});

// Remove item from cart
router.delete("/:itemId", auth, (req, res) => {
  const userId = resolveUserId(req);
  const { itemId } = req.params;
  if (!userId || !itemId)
    return res
      .status(401)
      .json({ error: "Authentication required or missing itemId" });
  if (!carts[userId]) return res.status(404).json({ error: "Cart not found" });
  carts[userId] = carts[userId].filter((item) => item._id !== itemId);
  res.status(204).end();
});

module.exports = router;
