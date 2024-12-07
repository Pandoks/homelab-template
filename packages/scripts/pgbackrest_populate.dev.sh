#!/bin/bash
SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT=$SCRIPT_DIR/../..
mkdir -p $PROJECT_ROOT/.certs/dev/{ca,server,client}
CERT_DIR=$PROJECT_ROOT/.certs/dev

# Make sure to run this script in the root of the scripts file (probably will need to cd in scripts)
SST_RESOURCE=$(pnpx sst shell -- node $SCRIPT_DIR/src/sst.js)

# Create TLS keys
DEV_CA=$CERT_DIR/ca
DEV_CLIENT=$CERT_DIR/client
DEV_SERVER=$CERT_DIR/server

# Common name (CN) should be the same name as the container
# Create CA
if [[ ! -f $DEV_CA/ca.crt || ! -f $DEV_CA/ca.key ]]; then
  openssl req -new -x509 -days 3650 -nodes \
    -out $DEV_CA/ca.crt \
    -keyout $DEV_CA/ca.key \
    -subj "/CN=devCA"
  chmod og-rwx $DEV_CA/ca.key
fi
# Server cert (backup)
if [[ ! -f $DEV_SERVER/server.crt || ! -f $DEV_SERVER/server.key ]]; then
  openssl req -new -nodes \
    -out $DEV_SERVER/server.csr \
    -keyout $DEV_SERVER/server.key \
    -subj "/CN=backup-1"
  chmod og-rwx $DEV_SERVER/server.key

  openssl x509 -req -in $DEV_SERVER/server.csr \
    -days 365 \
    -CA $DEV_CA/ca.crt \
    -CAkey $DEV_CA/ca.key \
    -CAcreateserial \
    -out $DEV_SERVER/server.crt
fi
# Client cert (masterdb)
if [[ ! -f $DEV_CLIENT/client.crt || ! -f $DEV_CLIENT/client.key ]]; then
  openssl req -new -nodes \
    -out $DEV_CLIENT/client.csr \
    -keyout $DEV_CLIENT/client.key \
    -subj "/CN=masterdb-1"
  chmod og-rwx $DEV_CLIENT/client.key

  openssl x509 -req -in $DEV_CLIENT/client.csr \
    -days 365 \
    -CA $DEV_CA/ca.crt \
    -CAkey $DEV_CA/ca.key \
    -CAcreateserial \
    -out $DEV_CLIENT/client.crt
fi
