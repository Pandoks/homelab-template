FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
ENV PUBLIC_APP_NAME='homelab-template'
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-lock.yaml .
RUN pnpm fetch
COPY . .
RUN pnpm install -r --offline
RUN pnpm run -r build

RUN pnpm deploy --filter=web --prod /prod/web
