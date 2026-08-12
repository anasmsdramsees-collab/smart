# Build from the repository root: docker build -f edge/syltra-edge-agent/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/mqtt-contracts/package.json packages/mqtt-contracts/package.json
COPY edge/syltra-edge-agent/package.json edge/syltra-edge-agent/package.json
RUN npm install --ignore-scripts
COPY packages/mqtt-contracts packages/mqtt-contracts
COPY edge/syltra-edge-agent edge/syltra-edge-agent
RUN npm run build --workspace=packages/mqtt-contracts
RUN npm run build --workspace=edge/syltra-edge-agent

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /workspace/edge/syltra-edge-agent/dist ./dist
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/edge/syltra-edge-agent/package.json ./package.json
COPY --from=build /workspace/packages/mqtt-contracts/package.json ./packages/mqtt-contracts/package.json
COPY --from=build /workspace/packages/mqtt-contracts/dist ./packages/mqtt-contracts/dist
CMD ["node", "dist/index.js"]
