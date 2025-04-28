#!/bin/sh

envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni/patroni.yaml
envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest/pgbackrest.conf

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

exec patroni /etc/patroni/patroni.yaml
