const path = require("path");

function getConfig() {
  return {
    PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
    MONGO_URI: process.env.MONGO_URI || "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    WORK_DIR: process.env.WORK_DIR || path.join(process.cwd(), "tmp"),
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
  // Gemini defaults tuned for broad availability; override via env if needed
  GOOGLE_API_MODEL: process.env.GOOGLE_API_MODEL || "gemini-1.5-flash-latest",
  GOOGLE_API_VERSION: process.env.GOOGLE_API_VERSION || "v1beta",
    DEFAULT_NODE_VERSION: process.env.DEFAULT_NODE_VERSION || "20-alpine",
  };
}

module.exports = { getConfig };
