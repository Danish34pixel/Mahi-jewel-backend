// routes/orders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Order = require("../models/order");
const User = require("../models/user");

/**
 * POST /api/orders
 * Create a new order
 */
router.post("/", async (req, res) => {
  try {
    const { userId, products, total, address, username, phone, paymentMethod } =
      req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Missing or invalid products" });
    }

    const orderId = `ORD${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const order = new Order({
      userId:
        userId && mongoose.Types.ObjectId.isValid(String(userId))
          ? userId
          : undefined,
      legacyUserIdString:
        userId && !mongoose.Types.ObjectId.isValid(String(userId))
          ? String(userId)
          : undefined,
      products,
      total: Number(total) || 0,
      address,
      username,
      phone,
      orderId,
      paymentMethod: paymentMethod || "COD",
      paymentStatus:
        paymentMethod && String(paymentMethod).toLowerCase() === "online"
          ? "pending"
          : "not-applicable",
    });

    await order.save();
    // Return order (no population here)
    return res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders/:userId
 * Get orders for a given userId (works with ObjectId or legacy username string)
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    let query = {};

    if (mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    } else {
      // legacy username string stored in legacyUserIdString or userId field as string
      query.$or = [{ legacyUserIdString: userId }, { userId: userId }];
    }

    const userOrders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return res.status(200).json(userOrders);
  } catch (err) {
    console.error("Fetch user orders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * GET /api/orders
 * Admin: return all orders with attached user info (minimal fields).
 * Response: an array of orders where each order has a `user` object when available.
 */
router.get("/", async (req, res) => {
  try {
    const all = await Order.find().sort({ createdAt: -1 }).lean();

    // Build set of candidate ids (ObjectId strings and legacy strings)
    const ids = Array.from(
      new Set(
        all
          .map((o) => {
            if (o.userId && typeof o.userId === "object")
              return String(o.userId._id || o.userId);
            return o.userId || o.legacyUserIdString || null;
          })
          .filter(Boolean)
      )
    );

    // Split into valid ObjectIds and non-ObjectId strings
    const objectIds = ids.filter((v) =>
      mongoose.Types.ObjectId.isValid(String(v))
    );
    const nonObjectIds = ids.filter(
      (v) => !mongoose.Types.ObjectId.isValid(String(v))
    );

    // Fetch user docs for objectIds
    const usersById = {};
    if (objectIds.length) {
      const users = await User.find(
        { _id: { $in: objectIds } },
        "_id name username email phone address"
      ).lean();
      users.forEach((u) => {
        usersById[String(u._id)] = u;
      });
    }

    // Fetch users by username (for legacy string ids)
    const usersByUsername = {};
    if (nonObjectIds.length) {
      const byName = await User.find(
        { username: { $in: nonObjectIds } },
        "_id name username email phone address"
      ).lean();
      byName.forEach((u) => {
        if (u.username) usersByUsername[String(u.username)] = u;
      });
    }

    // Attach minimal user info on each order
    const ordersWithUser = all.map((o) => {
      const plain = Object.assign({}, o); // shallow copy
      // Determine raw id value that was stored
      const rawId =
        o.userId && typeof o.userId === "object"
          ? String(o.userId._id || o.userId)
          : o.userId || o.legacyUserIdString || null;

      let attachedUser = null;
      if (rawId) {
        if (mongoose.Types.ObjectId.isValid(rawId))
          attachedUser = usersById[String(rawId)] || null;
        else attachedUser = usersByUsername[String(rawId)] || null;
      }

      if (attachedUser) {
        plain.user = {
          id: String(attachedUser._id),
          // prefer the order snapshot if present, otherwise live user fields
          name: plain.username || plain.name || attachedUser.name,
          username: plain.username || attachedUser.username,
          email: attachedUser.email,
          phone: plain.phone || attachedUser.phone,
          address: plain.address || attachedUser.address,
        };
      } else if (
        (plain.username && String(plain.username).trim() !== "") ||
        (plain.address && String(plain.address).trim() !== "")
      ) {
        // guest checkout saved username/address on order
        plain.user = {
          id: null,
          name: plain.username || "Guest",
          username: plain.username || "guest",
          email: null,
          phone: plain.phone || null,
          address: plain.address || null,
        };
      } else {
        plain.user = null;
      }

      return plain;
    });

    // Return as array (frontend expects array from axios.get(`${BASE_API_URL}/api/orders`))
    return res.json(ordersWithUser);
  } catch (err) {
    console.error("Fetch all orders error:", err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * PUT /api/orders/status/:orderId
 * Update status + arriving fields; returns the updated order (with user attached)
 */
router.put("/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, arrivingInfo, arrivingDate } = req.body;

    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    if (typeof arrivingInfo !== "undefined") order.arrivingInfo = arrivingInfo;
    if (typeof arrivingDate !== "undefined") order.arrivingDate = arrivingDate;
    await order.save();

    // Rebuild the order with user attached (same logic as above)
    const plain = order.toObject();
    let rawId =
      plain.userId && typeof plain.userId === "object"
        ? String(plain.userId._id || plain.userId)
        : plain.userId || plain.legacyUserIdString || null;

    let attachedUser = null;
    if (rawId) {
      if (mongoose.Types.ObjectId.isValid(rawId)) {
        attachedUser = await User.findById(
          rawId,
          "_id name username email phone address"
        ).lean();
      } else {
        attachedUser = await User.findOne(
          { username: rawId },
          "_id name username email phone address"
        ).lean();
      }
    }

    if (attachedUser) {
      plain.user = {
        id: String(attachedUser._id),
        name: plain.username || plain.name || attachedUser.name,
        username: plain.username || attachedUser.username,
        email: attachedUser.email,
        phone: plain.phone || attachedUser.phone,
        address: plain.address || attachedUser.address,
      };
    } else if (plain.address && String(plain.address).trim() !== "") {
      plain.user = {
        id: null,
        name: plain.username || "Guest",
        username: plain.username || "guest",
        email: null,
        phone: plain.phone || null,
        address: plain.address,
      };
    } else {
      plain.user = null;
    }

    return res.json(plain);
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ error: "Failed to update order" });
  }
});

/**
 * PUT /api/orders/address/:orderId
 * Update order address
 */
router.put("/address/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { address } = req.body;
    if (typeof address === "undefined")
      return res.status(400).json({ error: "Address required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.address = address;
    await order.save();
    return res.json(order);
  } catch (err) {
    console.error("Update order address error:", err);
    return res.status(500).json({ error: "Failed to update order address" });
  }
});

/**
 * POST /api/orders/backfill-addresses
 * Backfill missing order.address from users where possible
 */
router.post("/backfill-addresses", async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { address: null },
        { address: "" },
        { address: { $exists: false } },
      ],
    });

    let updated = 0;
    for (const ord of orders) {
      const rawId =
        ord.userId && typeof ord.userId === "object"
          ? String(ord.userId._id || ord.userId)
          : ord.userId || ord.legacyUserIdString || null;
      if (!rawId) continue;

      let user = null;
      if (mongoose.Types.ObjectId.isValid(rawId)) {
        user = await User.findById(rawId, "address").lean();
      }
      if (!user) {
        user = await User.findOne({ username: rawId }, "address").lean();
      }
      if (user && user.address) {
        ord.address = user.address;
        await ord.save();
        updated++;
      }
    }

    return res.json({ message: "Backfill complete", updated });
  } catch (err) {
    console.error("Backfill error:", err);
    return res.status(500).json({ error: "Backfill failed" });
  }
});

/**
 * PUT /api/orders/cancel/:orderId
 * Cancel order
 */
router.put("/cancel/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Cancelled";
    await order.save();
    return res.json(order);
  } catch (err) {
    console.error("Cancel order error:", err);
    return res.status(500).json({ error: "Failed to cancel order" });
  }
});

/**
 * DELETE /api/orders/:orderId
 * Delete order
 */
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    await Order.findByIdAndDelete(orderId);
    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete order error:", err);
    return res.status(500).json({ error: "Failed to delete order" });
  }
});

module.exports = router;
