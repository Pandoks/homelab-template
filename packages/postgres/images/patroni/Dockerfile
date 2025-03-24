FROM postgres:17

# Install extensions with minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  pgbackrest \
  postgresql-17-cron \
  postgresql-17-postgis-3 \
  postgresql-17-pgvector \
  python3-pip 

# Install patroni
RUN pip3 install --break-system-packages patroni[psycopg3,kubernetes]

# Configure postgres to load pg_cron
RUN echo "shared_preload_libraries = 'pg_cron,vector'" >> /usr/share/postgresql/postgresql.conf.sample \
  && echo "cron.database_name = 'postgres'" >> /usr/share/postgresql/postgresql.conf.sample

# Set correct permissions for pgbackrest
RUN mkdir -p /etc/pgbackrest \
  && chown -R postgres:postgres /etc/pgbackrest

# Use default postgres entrypoint for simple testing of extensions
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]

