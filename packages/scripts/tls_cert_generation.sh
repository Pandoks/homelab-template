#!/bin/bash
# Create directories
SCRIPT_DIR=$(dirname $(realpath $0))
mkdir -p $SCRIPT_DIR/../../.certs/{ca,server,client}

# # Generate CA
# openssl genrsa -out certs/ca/ca.key 4096
# openssl req -x509 -new -nodes -key certs/ca/ca.key -sha256 -days 365 -out certs/ca/ca.crt \
#   -subj "/C=US/ST=State/L=City/O=Org/CN=MyCA"
#
# # Generate Server Certificate
# openssl genrsa -out certs/server/server.key 4096
# openssl req -new -key certs/server/server.key -out certs/server/server.csr \
#   -subj "/C=US/ST=State/L=City/O=Org/CN=pgbackrest-server"
# openssl x509 -req -in certs/server/server.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
#   -CAcreateserial -out certs/server/server.crt -days 365 -sha256
#
# # Generate Client Certificate
# openssl genrsa -out certs/client/client.key 4096
# openssl req -new -key certs/client/client.key -out certs/client/client.csr \
#   -subj "/C=US/ST=State/L=City/O=Org/CN=postgres-client"
# openssl x509 -req -in certs/client/client.csr -CA certs/ca/ca.crt -CAkey certs/ca/ca.key \
#   -CAcreateserial -out certs/client/client.crt -days 365 -sha256
