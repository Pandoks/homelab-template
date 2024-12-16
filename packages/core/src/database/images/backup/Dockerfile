FROM alpine:3
RUN echo 'https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk update && apk upgrade --no-cache
RUN apk add pgbackrest --no-cache

RUN addgroup pgbackrest
RUN cat /etc/group
RUN adduser -D -h /var/lib/pgbackrest -s /bin/sh -G pgbackrest pgbackrest
RUN chown pgbackrest:pgbackrest /var/log/pgbackrest /etc/pgbackrest/pgbackrest.conf

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pgbackrest

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
