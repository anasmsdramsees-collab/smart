# Built from the repo root (see docker-compose.yml) so the npm workspace layout
# and the shared @syltra/mqtt-contracts package resolve the same way they do
# locally. See .dockerignore for what is kept out of the context.

# ── builder ───────────────────────────────────────────────────────────
# Two things here are load-bearing:
#   - The source is copied BEFORE `npm install`. This repo is an npm workspace,
#     and npm only installs a workspace's dependencies if that workspace's
#     package.json is already on disk. Installing from the root manifest alone
#     silently skipped every devDependency, so `tsc`/`nest` were missing and the
#     build died with exit 127.
#   - NODE_ENV is left unset. Setting it to production makes npm omit
#     devDependencies, which takes the build tooling with it.
FROM node:20-alpine AS builder
WORKDIR /app

COPY . .
RUN npm install --ignore-scripts

# The API imports @syltra/mqtt-contracts by its `main`/`types` entry points, so
# the shared package has to be compiled before the API can typecheck.
RUN npm run build --workspace=packages/mqtt-contracts \
 && npm run build --workspace=services/api

# ── runtime ───────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Carry the built tree over, then drop the build-only dependencies. Pruning is
# used rather than a fresh `npm install --omit=dev` because a clean install
# would hit the same workspace-manifest ordering problem described above.
COPY --from=builder /app ./
RUN npm prune --omit=dev && npm cache clean --force

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace=services/api"]
