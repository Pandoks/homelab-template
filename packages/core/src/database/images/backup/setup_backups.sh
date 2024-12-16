#!/bin/sh

if [ $ENV = "development" ]; then
  POSTGRES_USER_1=$POSTGRES_USER
  /usr/bin/process_env.sh /tmp/conf_templates/pgbackrest.conf --out /etc/pgbackrest/pgbackrest.conf
else
  /usr/bin/process_env.sh /etc/pgbackrest/pgbackrest.conf
fi

setup_stanzas() {
  until pg_isready -h $MASTER_HOST_1 -U $POSTGRES_USER_1 -d $POSTGRES_DB_1; do
    sleep 1
  done

  pgbackrest --stanza=$POSTGRES_DB_1 stanza-create
  pgbackrest --stanza=$POSTGRES_DB_1 check
  # Copy and paste the above but change the number for new databases
}

setup_stanzas &
