#!/bin/sh

setup_stanzas() {
  until pg_isready -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -p $POSTGRES_PORT; do
    sleep 1
  done

  pgbackrest --stanza=main stanza-create
  pgbackrest --stanza=main check
  pgbackrest --stanza=main --type=full backup
}

setup_stanzas &

pgbackrest server --config=/etc/pgbackrest/pgbackrest.conf
