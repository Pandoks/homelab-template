#!/bin/sh
set -e

ls /etc
# Substitute environment variables in patroni.yaml
if [ -f /tmp/conf_templates/patroni.yaml ]; then
  envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni.yaml
fi

# Start Patroni
exec python3 -m patroni /etc/patroni.yaml
