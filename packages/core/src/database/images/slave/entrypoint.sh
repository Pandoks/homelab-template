#!/bin/sh

if [ $ENV = "development" ]; then
  /usr/bin/process_env.sh /tmp/conf_templates/postgresql.conf --out /etc/postgresql/postgresql.conf
  /usr/bin/process_env.sh /tmp/conf_templates/pg_hba.conf --out /etc/postgresql/pg_hba.conf
  /usr/bin/process_env.sh /tmp/conf_templates/pgbackrest.conf --out /etc/pgbackrest/pgbackrest.conf
else
  /usr/bin/process_env.sh /etc/postgresql/postgresql.conf
  /usr/bin/process_env.sh /etc/postgresql/pg_hba.conf
  /usr/bin/process_env.sh /etc/pgbackrest/pgbackrest.conf
fi

/usr/bin/process_env.sh /etc/postgresql/pg_hba.conf

while [ -z "$(ls -A /var/lib/postgresql/data)" ]; do
  pg_basebackup -D /var/lib/postgresql/data/ -h images-masterdb-1 -X stream -c fast -U replicator
  chmod 700 /var/lib/postgresql/data
  sleep 1
done

touch /var/lib/postgresql/data/standby.signal

postgres -c config_file=/etc/postgresql/postgresql.conf &

until pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do
  sleep 1
done

PG_PID=$!
echo "Postgresql is ready"

monitor_pgbackrest() {
  while true; do
    wait $PGBR_PID
    echo "Pgbackrest doesn't exist. Starting pgbackrest..."
    pgbackrest server --config=/etc/pgbackrest/pgbackrest.conf &
    PGBR_PID=$!
    echo "Pgbackrest is ready"
  done
}
monitor_pgbackrest &

# shutdown container when database dies (allows for auto restart recovery)
wait $PG_PID
kill $PGBR_PID
