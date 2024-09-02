FROM startup-template-base:latest AS builder

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /prod/web /app
RUN ls -a
