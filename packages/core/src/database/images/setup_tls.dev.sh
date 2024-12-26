#!/bin/bash

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../../../..
scripts_dir=$project_root/scripts

$scripts_dir/generate_ca.sh
$scripts_dir/generate_tls.sh --name images-backup-1
$scripts_dir/generate_tls.sh --name images-masterdb-1
$scripts_dir/generate_tls.sh --name images-slavedb-1
