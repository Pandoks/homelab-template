ARG BASE=startup-template-base:latest
FROM ${BASE} AS builder

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /prod/web .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "build/index.js"]
