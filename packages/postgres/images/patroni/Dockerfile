FROM postgres:17

# Install extensions with minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  pgbackrest \
  postgresql-17-cron \
  postgresql-17-postgis-3 \
  postgresql-17-pgvector \
  python3-pip \
  gettext-base

# Install patroni
RUN pip3 install --break-system-packages patroni[psycopg3,kubernetes]

# Set correct permissions for pgbackrest
RUN mkdir -p /etc/pgbackrest \
  && chown -R postgres:postgres /etc/pgbackrest

# Copy Patroni entrypoint and configuration into the image
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Override entrypoint to start Patroni instead of PostgreSQL directly
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

