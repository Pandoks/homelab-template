#!/bin/bash
# WARNING: This will override whatever is in prod/dev

# Defaults
backup_servers=("images-backup-1")
client_servers=("images-slavedb-1" "images-masterdb-1")
prod=false

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Warning: This will override existing certificates"
  echo "Options:"
  echo "  -h, --help                 Show this help message"
  echo "  --backup-servers NAME1,... Set backup server names (comma-separated)"
  echo "                             (default: images-backup-1)"
  echo "  --clients NAME1,...        Set client server names (comma-separated)"
  echo "                             (default: images-slavedb-1,images-masterdb-1)"
  echo "  --prod                     Save certificates to SST Secrets"
}

while [[ $# -gt 0 ]]; do
  case $1 in
  --backup-servers)
    IFS=',' read -ra backup_servers <<<"$2"
    shift 2
    ;;
  --clients)
    IFS=',' read -ra client_servers <<<"$2"
    shift 2
    ;;
  --prod)
    prod=true
    shift
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
mkdir -p $project_root/.certs/temp/{server,client}
temp_dir=$project_root/.certs/temp
temp_client=$temp_dir/client
temp_server=$temp_dir/server
trap 'rm -rf $temp_dir' EXIT

if ! $prod; then
  if [ -f $]
  mkdir -p $project_root/.certs/dev/{server,client}
  dev_ca=$project_root/.certs/dev/ca
  dev_client=$project_root/.certs/dev/client
  dev_server=$project_root/.certs/dev/server
fi


# Server cert (backup server: pgbackrest)
for server in "${backup_servers[@]}"; do
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
done

# Client certs (databases: postgres)
for server in "${client_servers[@]}"; do
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
done
