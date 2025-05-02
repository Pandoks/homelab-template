#!/bin/sh

envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni/patroni.yaml
envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest.conf

chmod 700 /var/lib/postgresql/data

monitor_pgbackrest() {
  while true; do
    pgbackrest server --config=/etc/pgbackrest.conf &
    PGBR_PID=$!
    echo "Pgbackrest is ready"
    wait $PGBR_PID
    echo "Pgbackrest doesn't exist. Restarting pgbackrest..."
  done
}
monitor_pgbackrest &

exec $@
