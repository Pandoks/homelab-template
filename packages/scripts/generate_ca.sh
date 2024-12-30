#!/bin/bash
# WARNING: This will override whatever is in prod/dev

# Defaults
ca_name="dev_CA"
prod=false

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo "Warning: This will override existing certificates"
  echo "Options:"
  echo "  -h, --help                 Show this help message"
  echo "  --ca-name NAME             Set CA name (default: dev_CA)"
  echo "  --prod                     Save certificates to SST Secrets"
}

while [[ $# -gt 0 ]]; do
  case $1 in
  --ca-name)
    ca_name="$2"
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
mkdir -p $project_root/.certs/temp/ca
temp_dir=$project_root/.certs/temp
temp_ca=$temp_dir/ca
trap 'rm -rf $temp_dir' EXIT

if ! $prod; then
  mkdir -p $project_root/.certs/dev/ca
  dev_ca=$project_root/.certs/dev/ca
fi

openssl req -new -x509 -days 3650 -nodes \
  -out $temp_ca/ca.crt \
  -keyout $temp_ca/ca.key \
  -subj "/CN=$ca_name"

if $prod; then
  base64_ca_cert=$(cat $temp_ca/ca.crt | base64 -w 0)
  base64_ca_key=$(cat $temp_ca/ca.key | base64 -w 0)
  sst secret set CACert $base64_ca_cert
  sst secret set CAKey $base64_ca_key
else
  cp -r $temp_ca/* $dev_ca
  chmod og-rwx $dev_ca/ca.key
fi
