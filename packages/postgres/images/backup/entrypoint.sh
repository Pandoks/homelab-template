#!/bin/sh

envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest/pgbackrest.conf

cat /etc/supervisor/supervisord.conf

exec supervisord -c /etc/supervisor/supervisord.conf
