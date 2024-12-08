#!/bin/sh

echo "Setting permissions"
chown postgres:postgres /var/log/pgbackrest
chmod 755 /usr/bin/pgbackrest

chown postgres:postgres /etc/pgbackrest/pgbackrest.conf
chmod 640 /etc/pgbackrest/pgbackrest.conf

chown postgres:postgres /var/lib/pgbackrest
chmod 750 /var/lib/pgbackrest

exec $@
