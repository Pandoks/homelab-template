FROM debian:bookworm-slim

# NOTE: remove this after the next bookworm release of debian. includes the needed pgbackrest version to support postgres 17
RUN echo "deb http://deb.debian.org/debian/ trixie main contrib non-free" >> /etc/apt/sources.list.d/trixie.list

RUN apt-get update && apt-get install -y --no-install-recommends \
  pgbackrest=2.54.2-1 \
  gettext-base \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system pgbackrest
RUN adduser --system --ingroup pgbackrest --home /var/lib/pgbackrest --shell /bin/bash pgbackrest
RUN mkdir -p /var/log/pgbackrest /etc/pgbackrest
RUN chown pgbackrest:pgbackrest /var/log/pgbackrest /etc/pgbackrest

COPY ./postgres/images/backup/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pgbackrest

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

CMD [ "pgbackrest", "server", "--config=/etc/pgbackrest/pgbackrest.conf" ]
