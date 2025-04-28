#!/bin/sh

envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni/patroni.yaml
envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest/pgbackrest.conf

chmod 700 /var/lib/postgresql/data
echo 'chmodded'

exec patroni /etc/patroni/patroni.yaml
