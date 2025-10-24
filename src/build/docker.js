const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

async function buildDockerImage({ contextDir, dockerfileContent, imageTag }) {
  const dockerfilePath = path.join(contextDir, "Dockerfile");
  fs.writeFileSync(dockerfilePath, dockerfileContent, "utf8");

  const logs = [];
  const cmd = "docker";
  const args = ["build", "-t", imageTag, contextDir];
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => logs.push(d.toString()));
    p.stderr.on("data", (d) => logs.push(d.toString()));
    p.on("error", (err) => {
      logs.push(`Error: ${err.message}`);
      resolve({ success: false, logs });
    });
    p.on("close", (code) => {
      resolve({ success: code === 0, logs });
    });
  });
}

module.exports = { buildDockerImage };
