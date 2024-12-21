#!/bin/bash

# Defaults
ca_name="devCA"
backup_servers=("images-backup-1")
client_servers=("images-slavedb-1" "images-masterdb-1")

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo "  -h, --help                 Show this help message"
  echo "  --ca-name NAME             Set CA name (default: devCA)"
  echo "  --backup-servers NAME1,... Set backup server names (comma-separated)"
  echo "                             (default: images-backup-1)"
  echo "  --clients NAME1,...        Set client server names (comma-separated)"
  echo "                             (default: images-slavedb-1,images-masterdb-1)"
}

while [[ $# -gt 0 ]]; do
  case $1 in
  --ca-name)
    ca_name="$2"
    shift 2
    ;;
  --backup-servers)
    IFS=',' read -ra backup_servers <<<"$2"
    shift 2
    ;;
  --clients)
    IFS=',' read -ra client_servers <<<"$2"
    shift 2
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    usage
    exit 1
    ;;
  esac
done

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../..
mkdir -p $project_root/.certs/dev/{ca,server,client}
cert_dir=$project_root/.certs/dev

dev_ca=$cert_dir/ca
dev_client=$cert_dir/client
dev_server=$cert_dir/server

# Create CA
if [[ ! -f $dev_ca/ca.crt || ! -f $dev_ca/ca.key ]]; then
  openssl req -new -x509 -days 3650 -nodes \
    -out $dev_ca/ca.crt \
    -keyout $dev_ca/ca.key \
    -subj "/CN=$ca_name"
  chmod og-rwx $dev_ca/ca.key
fi

# Server cert (backup server: pgbackrest)
for server in "${backup_servers[@]}"; do
  if [[ ! -f "$dev_server/$server.crt" || ! -f "$dev_server/$server.key" ]]; then
    openssl req -new -nodes \
      -out "$dev_server/$server.csr" \
      -keyout "$dev_server/$server.key" \
      -subj "/CN=$server"
    chmod og-rwx "$dev_server/$server.key"
    openssl x509 -req -in "$dev_server/$server.csr" \
      -days 365 \
      -CA $dev_ca/ca.crt \
      -CAkey $dev_ca/ca.key \
      -CAcreateserial \
      -out "$dev_server/$server.crt"
  fi
done

# Client certs (databases: postgres)
for server in "${client_servers[@]}"; do
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
