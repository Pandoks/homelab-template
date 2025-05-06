#!/bin/sh

envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni/patroni.yaml
envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest.conf

chmod 700 /var/lib/postgresql/data

exec supervisord -c /etc/supervisor/supervisord.conf
