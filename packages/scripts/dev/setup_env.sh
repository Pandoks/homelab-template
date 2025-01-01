#!/bin/bash

script_dir=$(dirname $(realpath $0))
project_root=$script_dir/../../..

if [ ! -e $project_root/.env ]; then
  echo ".env file in the root of the project does not exist"
  exit 1
fi

rm -f $project_root/k3s/dev/.env.link
ln $project_root/.env $project_root/k3s/dev/.env.link

echo "Finished hard linking env files"
