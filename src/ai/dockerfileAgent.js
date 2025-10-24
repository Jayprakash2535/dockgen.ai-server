const fs = require("fs");
const path = require("path");
const { getConfig } = require("../config");

async function generateWithAI(repoDir, detected) {
  const { GOOGLE_API_KEY } = getConfig();
  if (!GOOGLE_API_KEY) {
    return null; // AI disabled
  }
  try {
  const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
  const { ChatPromptTemplate } = require("@langchain/core/prompts");

    const pkgJson = fs.existsSync(path.join(repoDir, "package.json"))
      ? fs.readFileSync(path.join(repoDir, "package.json"), "utf8")
      : "";

    const importantFiles = [
      "next.config.js",
      "next.config.ts",
      "vite.config.ts",
      "vite.config.js",
      "angular.json",
      "nuxt.config.ts",
    ]
      .filter((f) => fs.existsSync(path.join(repoDir, f)))
      .slice(0, 3)
      .map((f) => `FILE: ${f}\n${fs.readFileSync(path.join(repoDir, f), "utf8").slice(0, 4000)}`)
      .join("\n\n");

    const prompt = ChatPromptTemplate.fromTemplate([
      "You are DockGen, an expert in crafting minimal, production-ready Dockerfiles for JavaScript web apps.",
      "Detected stack: {detected}",
      "package.json (truncated):",
      "<pkg>",
      "{pkg}",
      "</pkg>",
      "Important files (may be truncated):",
      "<files>",
      "{files}",
      "</files>",
      "",
      "Rules:",
      "- Prefer multi-stage builds.",
      "- Use Node {nodeBase} for building.",
      "- For Next.js, run build then use next start on port 3000; copy .next and public.",
      "- For Vite/CRA/Vue/Angular, produce static build and serve with nginx on port 80.",
      "- For Node/Express backends, install deps with production only and run start.",
      "- Respect package manager if detectable (npm/yarn/pnpm/bun). Use frozen lockfile/ci when possible.",
      "- Output ONLY the Dockerfile contents, no explanations."
    ].join("\n"));

    const { GOOGLE_API_MODEL, GOOGLE_API_VERSION } = getConfig();
    const model = new ChatGoogleGenerativeAI({
      model: GOOGLE_API_MODEL,
      apiKey: GOOGLE_API_KEY,
      apiVersion: GOOGLE_API_VERSION,
      temperature: 0.2,
      maxOutputTokens: 1024,
    });

    const chain = prompt.pipe(model);
    const res = await chain.invoke({
      detected: JSON.stringify(detected, null, 2),
      pkg: pkgJson,
      files: importantFiles,
      nodeBase: require("../config").getConfig().DEFAULT_NODE_VERSION,
    });

    const text = res?.content || res?.text || "";
    const { sanitizeDockerfile } = require("../utils/sanitize");
    const cleaned = sanitizeDockerfile(String(text));
    if (cleaned.split("\n").length < 3) return null;
    return cleaned;
  } catch (err) {
    console.warn("AI generation failed, falling back:", err.message);
    return null;
  }
}

module.exports = { generateWithAI };
