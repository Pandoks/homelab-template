#!/bin/sh

setup_stanzas() {
  until pg_isready -h $MASTER_HOST -U $POSTGRES_USER -d $POSTGRES_DB; do
    sleep 1
  done

  pgbackrest --stanza=main stanza-create
}

setup_stanzas &

pgbackrest server --config=/etc/pgbackrest/pgbackrest.conf
