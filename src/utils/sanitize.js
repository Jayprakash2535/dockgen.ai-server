function sanitizeDockerfile(content) {
  if (!content) return "";
  let s = String(content);
  // Remove opening code fences with or without language labels
  s = s.replace(/```[a-zA-Z-]*\s*/g, "");
  // Remove any remaining triple backticks
  s = s.replace(/```/g, "");
  // Remove lines that are only code fences or labels (defensive)
  s = s
    .split(/\r?\n/)
    .filter((line) => !/^```/.test(line.trim()) && !/^\s*Dockerfile:?\s*$/i.test(line.trim()))
    .join("\n");
  return s.trim() + "\n";
}

module.exports = { sanitizeDockerfile };
