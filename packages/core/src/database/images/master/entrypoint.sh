#!/bin/sh

if [ $ENV = "development" ]; then
  /usr/bin/process_env.sh /tmp/postgresql/postgresql.conf --out /etc/postgresql/postgresql.conf
  /usr/bin/process_env.sh /tmp/postgresql/pg_hba.conf --out /etc/postgresql/pg_hba.conf
  /usr/bin/process_env.sh /tmp/pgbackrest/pgbackrest.conf --out /etc/pgbackrest/pgbackrest.conf
else
  /usr/bin/process_env.sh /etc/postgresql/postgresql.conf
  /usr/bin/process_env.sh /etc/postgresql/pg_hba.conf
  /usr/bin/process_env.sh /etc/pgbackrest/pgbackrest.conf
fi

docker-entrypoint.sh postgres -c config_file=/etc/postgresql/postgresql.conf &

until pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do
  sleep 1
done

PG_PID=$!
echo "Postgresql is ready"

monitor_pgbackrest() {
  while true; do
    pgbackrest server --config=/etc/pgbackrest/pgbackrest.conf &
    PGBR_PID=$!
    echo "Pgbackrest is ready"
    wait $PGBR_PID
    echo "Pgbackrest doesn't exist. Restarting pgbackrest..."
  done
}
monitor_pgbackrest &

# shutdown container when database dies (allows for auto restart recovery)
wait $PG_PID
kill $PGBR_PID
