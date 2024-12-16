FROM postgres:17-alpine
# postgres doesn't use the most updated alpine version so we need to add this installation source
# TODO: remove this source when the alpine version updates
RUN echo 'https://dl-cdn.alpinelinux.org/alpine/edge/community' >> /etc/apk/repositories
RUN apk update && apk upgrade --no-cache
RUN apk add pgbackrest --no-cache

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R postgres:postgres /etc/pgbackrest

USER postgres

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
