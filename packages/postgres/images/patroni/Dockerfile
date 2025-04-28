FROM postgres:17

RUN apt-get update && apt-get install -y --no-install-recommends \
  pgbackrest \
  postgresql-17-cron \
  postgresql-17-postgis-3 \
  postgresql-17-pgvector \
  python3-pip \
  gettext-base

RUN pip3 install --break-system-packages patroni[psycopg3,kubernetes]

RUN mkdir -p /etc/pgbackrest /etc/patroni \
  && chown -R postgres:postgres /etc/pgbackrest \
  && chown -R postgres:postgres /etc/patroni 

COPY ./postgres/images/patroni/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER postgres

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]
