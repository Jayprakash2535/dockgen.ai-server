# DockGen AI - Backend (Express)

API server that clones a GitHub repo, detects its JS stack, generates a Dockerfile (AI-assisted with Gemini when configured), and builds a Docker image.

## Environment

Create a `.env` in this folder with:

- PORT=4000 (default)
- CORS_ORIGIN=http://localhost:3000 (frontend origin)
- MONGO_URI=mongodb://localhost:27017/dockgen (optional)
- GOOGLE_API_KEY=... (optional, enables Gemini)
 - GOOGLE_API_MODEL=gemini-1.5-flash (recommended default) or gemini-1.5-pro-latest
 - GOOGLE_API_VERSION=v1 (recommended; avoids v1beta 404s)
- WORK_DIR=./tmp (default)
- DEFAULT_NODE_VERSION=20-alpine (default)

## Run

Install deps and start:

```
npm install
npm run dev
```

Health check: GET /health

## API

- POST /api/generate-build
  - body: { repoUrl, pat, imageName? }
  - returns: { success, detected, dockerfile, imageTag, logs[], jobId? }
- POST /api/push-dockerfile
  - body: { repoUrl, pat, dockerfile, branchName?, commitMessage? }
  - returns: { success, branch }

Notes:
- Requires Docker CLI available on the server.
- For private repos, PAT is required. For public, PAT may still be needed to avoid rate limits.