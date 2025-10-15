# syntax=docker/dockerfile:1

ARG SUPABASE_CLI_VERSION=2.51.0

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
ENV CI=true

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
ENV CI=true

ARG SUPABASE_CLI_VERSION
ARG TARGETOS
ARG TARGETARCH

# Copy workspace manifests for installing production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform-api/package.json apps/platform-api/package.json

# Install runtime dependencies and Supabase CLI prerequisites
RUN apk add --no-cache \
    bash \
    curl \
    docker-cli \
    docker-cli-compose \
    git \
    jq \
    openssl \
    tar

# Install production dependencies only for platform-api
RUN pnpm install --filter platform-api... --prod

# Install Supabase CLI (pinned version)
RUN curl -fsSL "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${TARGETOS:-linux}_${TARGETARCH:-amd64}.tar.gz" -o /tmp/supabase.tgz \
  && tar -xzf /tmp/supabase.tgz -C /usr/local/bin supabase \
  && chmod +x /usr/local/bin/supabase \
  && rm /tmp/supabase.tgz

# Copy build output
COPY --from=builder /app/apps/platform-api/dist apps/platform-api/dist
COPY --from=builder /app/apps/platform-api/migrations apps/platform-api/migrations

WORKDIR /app/apps/platform-api
RUN mkdir -p data/projects
VOLUME ["/app/apps/platform-api/data"]

ENV NODE_ENV=production
ENV PORT=4210
ENV HOST=0.0.0.0
ENV SUPABASE_CLI_VERSION=${SUPABASE_CLI_VERSION}
EXPOSE 4210

CMD ["node", "dist/main.js"]
