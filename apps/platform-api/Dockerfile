# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY src src
RUN pnpm install
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable pnpm
COPY package.json package.json
RUN pnpm install --prod --ignore-scripts
COPY --from=builder /app/dist dist
RUN mkdir -p data/projects
VOLUME ["/app/data"]
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
EXPOSE 4000
CMD ["node", "dist/main.js"]
