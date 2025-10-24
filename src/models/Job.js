const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    repoUrl: { type: String, required: true },
    imageTag: { type: String },
    dockerfile: { type: String },
    detected: { type: Object },
    logs: { type: [String], default: [] },
    status: { type: String, enum: ["pending", "success", "error"], default: "pending" },
    error: { type: String },
  },
  { timestamps: true }
);

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

module.exports = { Job };
