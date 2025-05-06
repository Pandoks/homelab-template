FROM postgres:17

# NOTE: remove this after the next bookworm release of debian. includes the needed pgbackrest version to support postgres 17
RUN echo "deb http://deb.debian.org/debian/ trixie main contrib non-free" >> /etc/apt/sources.list.d/trixie.list

RUN apt-get update && apt-get install -t bookworm -y --no-install-recommends \
  postgresql-17-cron \
  postgresql-17-postgis-3 \
  postgresql-17-pgvector \
  gettext-base \
  supervisor \
  && apt-get install -t trixie -y --no-install-recommends \
  pgbackrest \
  patroni \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/pgbackrest /etc/patroni \
  && chown -R postgres:postgres /var/lib/postgresql \
  && chown -R postgres:postgres /etc/pgbackrest \
  && chown -R postgres:postgres /etc/patroni 

COPY ./postgres/images/patroni/supervisord.conf /etc/supervisor/supervisord.conf
COPY ./postgres/images/patroni/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER postgres

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
