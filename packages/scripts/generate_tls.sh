#!/bin/bash
# WARNING: This will override whatever is in prod/dev

# Defaults
prod=false

usage() {
  echo "Usage: $0 -n COMMON_NAME"
  echo "Warning: This will override existing certificates"
  echo "Options:"
  echo "  -h, --help            Show this help message"
  echo "  -n, --name NAME       Set the certificate common name (required)"
  echo "  -c, --ca-dir DIR      Directory where ca.key and ca.crt live (Default: <project root>/.certs/dev/ca)"
  echo "  --prod                Save certificates to SST Secrets"
}

while [[ $# -gt 0 ]]; do
  case $1 in
  -n | --name)
    name="$2"
    shift 2
    ;;
  -c | --ca-dir)
    name="$2"
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

if [[ -z "$name" ]]; then
  echo "Error: --name option is required."
  usage
  exit 1
fi

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../..
mkdir -p $project_root/.certs/temp/tls
temp_dir=$project_root/.certs/temp
temp_tls=$temp_dir/tls
trap 'rm -rf $temp_dir' EXIT

if $prod; then
  # NOTE: KEEP THE QUOTES (""). They preserve the \n
  sst_secrets=$(sst secret list | sed '1d')
  base64_ca_cert=$(echo "$sst_secrets" | grep "CACert" | sed "s/CACert=//")
  base64_ca_key=$(echo "$sst_secrets" | grep "CAKey" | sed "s/CAKey=//")
  ca_serial=$(echo "$sst_secrets" | grep "CASerial" | sed "s/CASerial=//")

  echo "$base64_ca_cert" | base64 -d >$temp_tls/ca.crt
  echo "$base64_ca_key" | base64 -d >$temp_tls/ca.key
  if [ -n "$ca_serial" ]; then
    echo $ca_serial >$temp_tls/ca.srl
  fi
else
  if [ ! -f $project_root/.certs/dev/ca/ca.crt ] && [ ! -f $project_root/.certs/dev/ca/ca.key]; then
    echo "ERROR: Certified Authority needed (CA). Did you run generate_ca?"
    exit 1
  fi
  dev_ca=$project_root/.certs/dev/ca
  mkdir -p $project_root/.certs/dev/tls
  dev_tls=$project_root/.certs/dev/tls
fi

openssl req -new -nodes \
  -out "$temp_tls/$name.csr" \
  -keyout "$temp_tls/$name.key" \
  -subj "/CN=$name"

if $prod; then
  openssl x509 -req -in "$temp_tls/$name.csr" \
    -days 365 \
    -CA $temp_tls/ca.crt \
    -CAkey $temp_tls/ca.key \
    -CAcreateserial \
    -out "$temp_tls/$name.crt"

  base64_tls_cert=$(cat $temp_tls/$name.crt | base64 -w 0)
  base64_tls_key=$(cat $temp_tls/$name.key | base64 -w 0)

  cert_name="${name}Cert"
  key_name="${name}Key"
  sst secret set $cert_name $base64_tls_cert
  sst secret set $key_name $base64_tls_key
  sst secret set CASerial $(cat $temp_tls/ca.srl)
else
  cp -r $temp_tls/* $dev_tls
  chmod og-rwx "$dev_tls/$name.key"
  openssl x509 -req -in "$dev_tls/$name.csr" \
    -days 365 \
    -CA $dev_ca/ca.crt \
    -CAkey $dev_ca/ca.key \
    -CAcreateserial \
    -out "$dev_tls/$name.crt"
  rm $dev_tls/$name.csr
fi
