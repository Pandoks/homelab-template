FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  pgbackrest=2.45-1 \
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
