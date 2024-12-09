#!/bin/sh

PGPASSWORD=password pg_basebackup -D /var/lib/postgresql/data/ -h images-masterdb-1 -X stream -c fast -U replicator
chmod 700 /var/lib/postgresql/data
touch /var/lib/postgresql/data/standby.signal

exec $@
