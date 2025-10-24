/*
 DockGen AI - Backend Server (Express)
*/
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { connectDBIfConfigured } = require("./src/db");
const { apiRouter } = require("./src/routes/api");
const { getConfig } = require("./src/config");

const app = express();
const cfg = getConfig();
// Ensure work directory exists (safe if already present)
try {
  const fs = require("fs");
  fs.mkdirSync(cfg.WORK_DIR, { recursive: true });
} catch (e) {
  console.warn("Could not ensure WORK_DIR exists:", e.message);
}

// Simple wildcard CORS for development: allow all origins and common methods/headers
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: false,
    optionsSuccessStatus: 200,
    maxAge: 86400,
  })
);
app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "dockgen-server", time: new Date().toISOString() });
});

// API routes
app.use("/api", apiRouter);

// Start
connectDBIfConfigured()
  .then(() => {
    app.listen(cfg.PORT, () => {
      console.log(`dockgen-server listening on http://localhost:${cfg.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init server:", err);
    process.exit(1);
  });
