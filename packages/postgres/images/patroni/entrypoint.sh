#!/bin/sh

envsubst </tmp/conf_templates/patroni.yaml >/etc/patroni.yaml

exec patroni /etc/patroni.yaml
