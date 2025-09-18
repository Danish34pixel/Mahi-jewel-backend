require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB for backfill.");

  try {
    // Find orders missing an address (null or empty string)
    const orders = await Order.find({
      $or: [
        { address: { $exists: false } },
        { address: "" },
        { address: null },
      ],
    });
    console.log(`Found ${orders.length} orders without address.`);

    let updated = 0;
    for (const o of orders) {
      let user = null;
      const uid = o.userId;
      if (!uid) continue;

      // Try ObjectId match
      if (mongoose.Types.ObjectId.isValid(String(uid))) {
        try {
          user = await User.findById(String(uid));
        } catch (e) {
          // ignore
        }
      }

      // If not found and uid is a string (like 'live-test' or username), try matching username
      if (!user && typeof uid === "string") {
        user = await User.findOne({ username: uid });
      }

      // If still not found, skip
      if (!user) continue;

      if (user.address && user.address.trim() !== "") {
        o.address = user.address;
        await o.save();
        updated++;
        console.log(
          `Updated order ${o._id} with address from user ${user._id}`
        );
      }
    }

    console.log(`Backfill complete. Updated ${updated} orders.`);
  } catch (err) {
    console.error("Backfill error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

run();
