const mongoose = require("mongoose");
const { getConfig } = require("./config");

async function connectDBIfConfigured() {
  const { MONGO_URI } = getConfig();
  if (!MONGO_URI) {
    console.log("MONGO_URI not set – continuing without database.");
    return;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGO_URI, { dbName: "dockgen" });
  console.log("Connected to MongoDB");
}

module.exports = { connectDBIfConfigured };
