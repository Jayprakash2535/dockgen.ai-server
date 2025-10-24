const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const simpleGit = require("simple-git");

function parseRepoInfo(repoUrl) {
  // supports https://github.com/owner/repo(.git)
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

function withAuth(repoUrl, pat) {
  if (!pat) return repoUrl;
  // Embed PAT as password with a dummy username to satisfy Basic auth format
  // https://x-access-token:<PAT>@github.com/owner/repo.git
  const token = encodeURIComponent(pat);
  return repoUrl.replace(
    /^https:\/\//i,
    `https://x-access-token:${token}@`
  );
}

async function cloneRepo(baseDir, repoUrl, pat) {
  const id = randomUUID();
  const dir = path.join(baseDir, id);
  fs.mkdirSync(dir, { recursive: true });
  const git = simpleGit();
  const authUrl = withAuth(repoUrl, pat);
  await git.clone(authUrl, dir, ["--depth", "1"]);
  return dir;
}

function readJSONSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function detectStack(repoDir) {
  const pkg = readJSONSafe(path.join(repoDir, "package.json")) || {};
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const has = (name) => Boolean(deps[name]);

  const indicators = {
    next: has("next"),
    react: has("react"),
    vite: has("vite"),
    vue: has("vue"),
    angular: has("@angular/core"),
    express: has("express"),
    nestjs: has("@nestjs/core"),
    ts: has("typescript"),
  };

  let type = "node";
  if (indicators.next) type = "nextjs";
  else if (indicators.angular) type = "angular";
  else if (indicators.vue) type = "vue";
  else if (indicators.react) type = indicators.vite ? "react-vite" : "react";
  else if (indicators.express || indicators.nestjs) type = "node";

  // Find package manager
  const hasYarn = fs.existsSync(path.join(repoDir, "yarn.lock"));
  const hasPnpm = fs.existsSync(path.join(repoDir, "pnpm-lock.yaml"));
  const hasBun = fs.existsSync(path.join(repoDir, "bun.lockb"));

  const pkgManager = hasPnpm ? "pnpm" : hasYarn ? "yarn" : hasBun ? "bun" : "npm";

  return {
    type,
    pkg,
    pkgManager,
    hasBuild: Boolean((pkg.scripts || {}).build),
    hasStart: Boolean((pkg.scripts || {}).start),
  };
}

function cleanupDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

module.exports = { parseRepoInfo, cloneRepo, detectStack, cleanupDir, withAuth };
