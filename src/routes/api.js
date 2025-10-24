const path = require("path");
const fs = require("fs");
const express = require("express");
const { z } = require("zod");
const { getConfig } = require("../config");
const { Job } = require("../models/Job");
const { cloneRepo, detectStack, cleanupDir, parseRepoInfo, withAuth } = require("../utils/repo");
const { getTemplateForDetection } = require("../generator/dockerfileTemplates");
const { sanitizeDockerfile } = require("../utils/sanitize");
const { generateWithAI } = require("../ai/dockerfileAgent");
const { buildDockerImage } = require("../build/docker");
const simpleGit = require("simple-git");

const apiRouter = express.Router();

const generateSchema = z.object({
  repoUrl: z.string().url(),
  pat: z.string().min(1, "PAT is required"),
  imageName: z.string().optional(),
});

apiRouter.post("/generate-build", async (req, res) => {
  const parse = generateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const { repoUrl, pat, imageName } = parse.data;
  const cfg = getConfig();

  const job = new Job({ repoUrl, status: "pending" });
  try {
    const repoDir = await cloneRepo(cfg.WORK_DIR, repoUrl, pat);
    const detected = detectStack(repoDir);

    // Try AI first
    let dockerfile = await generateWithAI(repoDir, detected);
    if (!dockerfile) dockerfile = getTemplateForDetection(detected);
    dockerfile = sanitizeDockerfile(dockerfile);

    // Heuristic: For frameworks that require devDependencies at build time (e.g., Next.js, Vite, Angular, CRA),
    // override AI output with our robust template if the AI Dockerfile installs prod-only deps before build.
    const needsDevAtBuild = ["nextjs", "react-vite", "react", "vue", "angular"].includes(detected.type);
    const prodOnlyInstallPattern = /(npm\s+ci\s+.*--production|npm\s+install\s+.*--production|pnpm\s+install\s+.*--prod|yarn\s+install\s+.*--production)/i;
    if (needsDevAtBuild && prodOnlyInstallPattern.test(dockerfile)) {
      dockerfile = getTemplateForDetection(detected);
    }

    const repoInfo = parseRepoInfo(repoUrl) || { name: "image" };
    const tag = imageName || `${repoInfo.name.toLowerCase()}:dockgen-${Date.now()}`;

    const build = await buildDockerImage({ contextDir: repoDir, dockerfileContent: dockerfile, imageTag: tag });

    job.status = build.success ? "success" : "error";
    job.detected = detected;
    job.dockerfile = dockerfile;
    job.imageTag = tag;
    job.logs = build.logs;
    await job.save().catch(() => {});

    cleanupDir(repoDir);
    res.json({ success: build.success, detected, dockerfile, imageTag: tag, logs: build.logs, jobId: job._id });
  } catch (err) {
    job.status = "error";
    job.error = err.message;
    await job.save().catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
});

const pushSchema = z.object({
  repoUrl: z.string().url(),
  pat: z.string().min(1),
  dockerfile: z.string().min(10),
  branchName: z.string().optional(),
  commitMessage: z.string().optional(),
});

apiRouter.post("/push-dockerfile", async (req, res) => {
  const parse = pushSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  let { repoUrl, pat, dockerfile } = parse.data;
  dockerfile = sanitizeDockerfile(dockerfile);
  const branchName = parse.data.branchName || `dockgen/dockerfile-${Date.now()}`;
  const commitMessage = parse.data.commitMessage || "chore(dockgen): add generated Dockerfile";

  const cfg = getConfig();
  const repoInfo = parseRepoInfo(repoUrl);
  if (!repoInfo) return res.status(400).json({ error: "Unsupported repo URL" });

  let repoDir;
  try {
    repoDir = await cloneRepo(cfg.WORK_DIR, repoUrl, pat);
    const git = simpleGit(repoDir);
    // create branch
    await git.checkoutLocalBranch(branchName);
    // write Dockerfile
    fs.writeFileSync(path.join(repoDir, "Dockerfile"), dockerfile, "utf8");
    await git.add(["Dockerfile"]);
    await git.commit(commitMessage);
    // set auth remote and push
    const authUrl = withAuth(repoUrl, pat);
    await git.push(["--set-upstream", authUrl, branchName]);

    res.json({ success: true, branch: branchName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (repoDir) {
      try { cleanupDir(repoDir); } catch {}
    }
  }
});

module.exports = { apiRouter };
