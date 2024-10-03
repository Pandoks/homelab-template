FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-lock.yaml .
RUN pnpm fetch
COPY . .
RUN npx --yes sst shell --stage pandoks -- pnpm run -r build

RUN pnpm deploy --filter=web --prod /prod/web
