#!/bin/sh

if [ $ENV = "development" ]; then
  /usr/local/bin/process_env.sh /tmp/conf_templates/postgresql.conf --out /etc/postgresql/postgresql.conf
  /usr/local/bin/process_env.sh /tmp/conf_templates/pg_hba.conf --out /etc/postgresql/pg_hba.conf
  /usr/local/bin/process_env.sh /tmp/conf_templates/pgbackrest.conf --out /etc/pgbackrest/pgbackrest.conf
else
  /usr/local/bin/process_env.sh /etc/postgresql/postgresql.conf
  /usr/local/bin/process_env.sh /etc/postgresql/pg_hba.conf
  /usr/local/bin/process_env.sh /etc/pgbackrest/pgbackrest.conf
fi
