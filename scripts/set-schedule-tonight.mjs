// Set a few products to a "scheduled" availability window that covers TONIGHT
// (current IST time -> 23:59), so the app can test schedule display/matching.
//
// Usage:
//   node scripts/set-schedule-tonight.mjs            (dry run – shows what it will do)
//   node scripts/set-schedule-tonight.mjs --apply    (writes to DB)
//   node scripts/set-schedule-tonight.mjs --apply --pincode 603210 --count 3

import mongoose from "mongoose";
import fs from "node:fs";

// --- read MONGO_URI straight from .env (no dotenv noise on stdout) ---
const env = fs.readFileSync(".env", "utf8");
const uriLine = env.split(/\r?\n/).find((l) => l.startsWith("MONGO_URI="));
const MONGO_URI = uriLine ? uriLine.slice("MONGO_URI=".length).trim() : "";
if (!MONGO_URI) {
    console.error("MONGO_URI not found in .env");
    process.exit(1);
}

// --- args ---
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const pincode = getArg("--pincode", "603210");
const count = Number(getArg("--count", "3"));
function getArg(flag, def) {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

// --- compute IST "tonight" window: from current IST time (floored to :00) to 23:59 ---
const istNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);
const fromHour = istNow.getHours();
const fromMinutes = fromHour * 60; // top of current hour
const toMinutes = 23 * 60 + 59; // 23:59
const pad = (n) => String(n).padStart(2, "0");
const fromTime = `${pad(fromHour)}:00`;
const toTime = "23:59";
const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

const availability = {
    type: "scheduled",
    fromTime,
    toTime,
    fromMinutes,
    toMinutes,
};

console.log("IST now      :", istNow.toString());
console.log("currentMinutes:", currentMinutes);
console.log("Window to set:", availability);
console.log(
    "Within window:",
    currentMinutes >= fromMinutes && currentMinutes <= toMinutes ? "YES (available now)" : "NO"
);

await mongoose.connect(MONGO_URI);

const Product = mongoose.connection.collection("products");
const VendorProfile = mongoose.connection.collection("vendorprofiles");

// pick vendors in this pincode, then their newest products
const vendors = await VendorProfile.find({
    "storeLocationAddress.postalCode": pincode,
})
    .project({ user: 1 })
    .toArray();
const vendorIds = vendors.map((v) => v.user);

if (!vendorIds.length) {
    console.log(`No vendors found for pincode ${pincode}. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
}

const products = await Product.find({
    isActive: true,
    vendorId: { $in: vendorIds },
})
    .sort({ createdAt: -1 })
    .limit(count)
    .project({ name: 1 })
    .toArray();

console.log(`\nTargeting ${products.length} product(s) at pincode ${pincode}:`);
products.forEach((p) => console.log("  -", p._id.toString(), p.name));

if (!APPLY) {
    console.log("\nDRY RUN — re-run with --apply to write these changes.");
    await mongoose.disconnect();
    process.exit(0);
}

const ids = products.map((p) => p._id);
const res = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { availability } }
);
console.log(`\nApplied. matched=${res.matchedCount} modified=${res.modifiedCount}`);

await mongoose.disconnect();
