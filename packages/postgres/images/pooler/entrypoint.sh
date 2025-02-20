#!/bin/sh

if [ $ENV = "development" ]; then
  /usr/local/bin/process_env.sh /tmp/conf_templates/pgcat.toml --out /etc/pgcat/pgcat.toml
else
  /usr/local/bin/process_env.sh /etc/pgcat/pgcat.toml
fi

exec $@
