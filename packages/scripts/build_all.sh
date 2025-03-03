#!/bin/bash

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../..

docker compose -f $project_root/compose.yaml build
docker compose -f $project_root/packages/postgres/images/compose.yaml --profile build-for-prod build
