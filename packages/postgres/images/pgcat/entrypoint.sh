#!/bin/sh

envsubst </tmp/conf_templates/pgcat.toml >/etc/pgcat/pgcat.toml

exec $@
