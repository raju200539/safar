# Single-stage: install, build, run. (Kept simple on purpose —
# `pnpm deploy` needs workspace settings that fight the lockfile.)
FROM node:22-alpine
RUN npm install -g pnpm@10.14.0
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY data/gtfs ./data/gtfs
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @hyd/shared build \
 && pnpm --filter @hyd/api build
WORKDIR /app/apps/api
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/main.js"]
