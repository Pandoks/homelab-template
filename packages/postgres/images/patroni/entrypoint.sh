#!/bin/bash
set -e

# Substitute environment variables in patroni.yaml
if [ -f /etc/patroni/patroni.yaml ]; then
    envsubst < /etc/patroni/patroni.yaml > /tmp/patroni.yaml
    mv /tmp/patroni.yaml /etc/patroni/patroni.yaml
fi

# Start Patroni
exec python3 -m patroni /etc/patroni/patroni.yaml