#!/bin/sh

envsubst </tmp/conf_templates/postgresql.conf >/etc/postgresql/postgresql.conf
envsubst </tmp/conf_templates/pg_hba.conf >/etc/postgresql/pg_hba.conf
envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest/pgbackrest.conf

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
