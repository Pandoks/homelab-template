FROM redis:7-alpine AS runner

ARG USERNAME
ARG PASSWORD

COPY redis.conf redis.conf
RUN echo "user ${USERNAME} on >${PASSWORD} ~* &* +@all" > users.acl

EXPOSE 6379
CMD ["redis-server"]
