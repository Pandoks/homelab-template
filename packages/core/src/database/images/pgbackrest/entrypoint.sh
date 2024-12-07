#!/bin/sh

echo "Setting permissions"
chown -R postgres:postgres /var/log/pgbackrest
chmod 640 /etc/pgbackrest/pgbackrest.conf
chown postgres:postgres /etc/pgbackrest/pgbackrest.conf
chown -R postgres:postgres /var/lib/pgbackrest
chown -R postgres:postgres /var/spool/pgbackrest

echo "Switching users"
su postgres

exec $@
