FROM debian:bookworm-slim

# NOTE: remove this after the next bookworm release of debian. includes the needed pgbackrest version to support postgres 17
RUN echo "deb http://deb.debian.org/debian/ trixie main contrib non-free" >> /etc/apt/sources.list.d/trixie.list

RUN apt-get update && apt-get install -t bookworm -y --no-install-recommends \
  gettext-base \
  supervisor \
  cron \
  && apt-get install -t trixie -y --no-install-recommends \
  pgbackrest \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --system pgbackrest
RUN adduser --system --ingroup pgbackrest --home /var/lib/pgbackrest --shell /bin/bash pgbackrest
RUN mkdir -p /var/log/pgbackrest /etc/pgbackrest
RUN chown pgbackrest:pgbackrest /var/log/pgbackrest /etc/pgbackrest /dev/stdout /dev/stderr

COPY ./postgres/images/backup/supervisord.conf /etc/supervisor/supervisord.conf
COPY ./postgres/images/backup/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER pgbackrest

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
