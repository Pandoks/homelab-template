#!/bin/sh

envsubst </tmp/conf_templates/pgbackrest.conf >/etc/pgbackrest/pgbackrest.conf

exec supervisord -c /etc/supervisor/supervisord.conf
