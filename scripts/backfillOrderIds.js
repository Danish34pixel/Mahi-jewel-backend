// Backfill script to populate missing orderId values for existing orders.
// Usage: MONGODB_URI="youruri" node scripts/backfillOrderIds.js

const mongoose = require("mongoose");
require("dotenv").config();
const Order = require("../models/order");

function generateOrderId() {
  return `ORD${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

async function main() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/test";
  if (!uri) {
    console.error("No MongoDB URI found in environment (MONGODB_URI).");
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB for backfill.");

  try {
    const docs = await Order.find({
      $or: [
        { orderId: { $exists: false } },
        { orderId: null },
        { orderId: "" },
      ],
    }).lean();
    if (!docs.length) {
      console.log("No orders require backfill.");
      return process.exit(0);
    }

    console.log(`Found ${docs.length} orders to update.`);
    const ops = docs.map((d) => {
      return {
        updateOne: {
          filter: { _id: d._id },
          update: { $set: { orderId: generateOrderId() } },
        },
      };
    });

    const res = await Order.bulkWrite(ops);
    console.log("Bulk update result:", res);
    console.log("Backfill complete.");
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 2;
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
