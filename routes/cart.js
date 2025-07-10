const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Clear all cart items for a user
router.delete("/clear", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ message: "userId required" });
  try {
    await CartItem.deleteMany({ userId });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Simple cart schema (userId, productId, quantity, name, price, image)
const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  name: String,
  price: Number,
  image: String,
  quantity: { type: Number, default: 1 },
});
const CartItem = mongoose.model("CartItem", cartSchema);

// Add to cart
router.post("/add", async (req, res) => {
  const { userId, productId, name, price, image } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ message: "userId and productId required" });
  }
  try {
    let item = await CartItem.findOne({ userId, productId });
    if (item) {
      item.quantity += 1;
      await item.save();
      return res.json({ message: "Quantity updated in cart" });
    }
    await CartItem.create({ userId, productId, name, price, image });
    res.json({ message: "Added to cart" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get cart for user
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "userId required" });
  try {
    const items = await CartItem.find({ userId });
    // Ensure _id is included and returned as a string
    const itemsWithId = items.map((item) => ({
      ...item.toObject(),
      _id: item._id.toString(),
    }));
    res.json(itemsWithId);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update cart item quantity
router.put("/:id", async (req, res) => {
  try {
    const { quantity } = req.body;
    const updated = await CartItem.findByIdAndUpdate(
      req.params.id,
      { quantity },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete cart item by id (MongoDB _id) or by userId and productId
router.delete("/:id", async (req, res) => {
  try {
    console.log("DELETE /api/cart/:id called with id:", req.params.id);
    // Log all cart items before deletion
    const allItems = await CartItem.find({});
    console.log(
      "All cart items before deletion:",
      allItems.map((i) => ({
        _id: i._id.toString(),
        userId: i.userId,
        productId: i.productId,
      }))
    );

    // Try to delete by MongoDB _id first (convert to ObjectId)
    let deleted = null;
    let objectId = null;
    try {
      objectId = new mongoose.Types.ObjectId(req.params.id);
    } catch (e) {
      console.error("Invalid ObjectId:", req.params.id);
      return res.status(400).json({ message: "Invalid cart item id" });
    }
    try {
      deleted = await CartItem.findByIdAndDelete(objectId);
    } catch (e) {
      console.error("Error deleting by ObjectId:", e);
      return res.status(500).json({ message: "Error deleting cart item" });
    }
    if (deleted) {
      console.log("Deleted by _id:", req.params.id);
      return res.json({ message: "Cart item deleted by _id" });
    }
    // If not found, try to delete by userId and productId
    const { userId, productId } = req.query;
    if (userId && productId) {
      deleted = await CartItem.findOneAndDelete({ userId, productId });
      if (deleted) {
        console.log("Deleted by userId and productId:", { userId, productId });
        return res.json({
          message: "Cart item deleted by userId and productId",
        });
      }
    }
    console.log("Cart item not found for id:", req.params.id);
    return res.status(404).json({ message: "Cart item not found" });
  } catch (err) {
    console.error("Error deleting cart item:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
