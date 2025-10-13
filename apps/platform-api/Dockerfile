# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm

# Copy workspace metadata
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
# Copy platform API and any shared packages it depends on
COPY apps/platform-api apps/platform-api
# Include packages folder if needed for shared code
COPY packages packages

# Install dependencies for the platform-api workspace only
RUN pnpm install --filter platform-api...
# Build the platform API
RUN pnpm --filter platform-api... build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable pnpm

# Copy workspace manifests for installing production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform-api/package.json apps/platform-api/package.json

# Install production dependencies only for platform-api
RUN pnpm install --filter platform-api... --prod

# Copy build output
COPY --from=builder /app/apps/platform-api/dist apps/platform-api/dist

WORKDIR /app/apps/platform-api
RUN mkdir -p data/projects
VOLUME ["/app/apps/platform-api/data"]

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
EXPOSE 4000

CMD ["node", "dist/main.js"]
