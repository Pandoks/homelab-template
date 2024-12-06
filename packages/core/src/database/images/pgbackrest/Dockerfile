FROM alpine:3
RUN apk update && apk upgrade --no-cache
RUN apk add pgbackrest --no-cache

CMD ["pgbackrest", "server"]
