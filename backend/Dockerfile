# AI Discovery Platform — backend image.
#
# Multi-stage: install + build on a full Node image, then a slim Node 24
# runtime with production-only dependencies, running as a non-root user.
#
# Build from the MONOREPO ROOT (the backend imports the `shared` workspace):
#   cp backend/.dockerignore .dockerignore   # docker only reads it at the context root
#   docker build -f backend/Dockerfile -t ai-discover-backend .
#
# Run (secrets come from the environment, never baked into the image):
#   docker run --env-file .env -p 4000:4000 ai-discover-backend
#
# The container does NOT run migrations or seeds — apply those with psql
# before first boot (see docs/deployment.md).

# ---------- stage 1: install + build ----------
FROM node:24-slim AS build
WORKDIR /app

# Install workspace dependencies first for better layer caching.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm ci

# Copy sources and build both workspaces (backend's build script also
# bundles dist/test/test-schema.sql, which runtime tests need).
COPY backend/ ./backend/
COPY shared/ ./shared/
RUN npm run build --workspace=shared \
 && npm run build --workspace=backend

# ---------- stage 2: slim production runtime ----------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production-only dependencies. `npm prune --omit=dev` needs every workspace's
# package.json to resolve the tree, so all three are copied even though only
# backend + shared ship in this image (the frontend deploys as static files).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/shared/package.json ./shared/
COPY --from=build /app/frontend/package.json ./frontend/
RUN npm prune --omit=dev && npm cache clean --force

# Compiled backend + shared bundles.
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/shared/dist ./shared/dist

# Run as non-root. `node` ships with the official image; chown the app tree.
RUN chown -R node:node /app
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/src/index.js"]
