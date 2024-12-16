#!/bin/sh

/usr/bin/setup_backups.sh

pgbackrest server --config=/etc/pgbackrest/pgbackrest.conf
