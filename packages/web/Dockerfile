# NOTE: Docker context should be in the root of the monorepo so we can access the package-lock.json
FROM node:20-alpine AS builder
WORKDIR /app
COPY ./packages/web/package.json package-lock.json ./
RUN cat package.json
RUN npm ci
COPY ./packages/web .
RUN ls
RUN npm run build:prod
RUN npm prune --production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD [ "wget", "--no-verbose", "tries=1", "--spider", "http://localhost:3000" ]
CMD ["node", "build/index.js"]
