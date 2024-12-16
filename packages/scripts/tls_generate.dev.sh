#!/bin/bash

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../..
mkdir -p $project_root/.certs/dev/{ca,server,client}
cert_dir=$project_root/.certs/dev

# Create TLS keys
dev_ca=$cert_dir/ca
dev_client=$cert_dir/client
dev_server=$cert_dir/server

# Create CA
if [[ ! -f $dev_ca/ca.crt || ! -f $dev_ca/ca.key ]]; then
  openssl req -new -x509 -days 3650 -nodes \
    -out $dev_ca/ca.crt \
    -keyout $dev_ca/ca.key \
    -subj "/CN=devCA"
  chmod og-rwx $dev_ca/ca.key
fi

# Server cert (backup)
if [[ ! -f $dev_server/server.crt || ! -f $dev_server/server.key ]]; then
  openssl req -new -nodes \
    -out $dev_server/server.csr \
    -keyout $dev_server/server.key \
    -subj "/CN=images-backup-1"
  chmod og-rwx $dev_server/server.key

  openssl x509 -req -in $dev_server/server.csr \
    -days 365 \
    -CA $dev_ca/ca.crt \
    -CAkey $dev_ca/ca.key \
    -CAcreateserial \
    -out $dev_server/server.crt
fi

# Client certs (databases)
backup_servers=("images-slavedb-1" "images-masterdb-1")
for server in "${backup_servers[@]}"; do
  if [[ ! -f "$dev_client/$server.crt" || ! -f "$dev_client/$server.key" ]]; then
    openssl req -new -nodes \
      -out "$dev_client/$server.csr" \
      -keyout "$dev_client/$server.key" \
      -subj "/CN=$server"
    chmod og-rwx "$dev_client/$server.key"

    openssl x509 -req -in "$dev_client/$server.csr" \
      -days 365 \
      -CA $dev_ca/ca.crt \
      -CAkey $dev_ca/ca.key \
      -CAcreateserial \
      -out "$dev_client/$server.crt"
  fi
done
