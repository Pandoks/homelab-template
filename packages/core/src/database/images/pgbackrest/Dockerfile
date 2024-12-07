FROM alpine:3
RUN apk update && apk upgrade --no-cache
RUN apk add pgbackrest --no-cache

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

USER postgres

CMD ["pgbackrest", "server"]
