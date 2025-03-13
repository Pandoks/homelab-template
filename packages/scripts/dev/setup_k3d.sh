#!/bin/bash

DOCKER_SUBNET=$(docker network inspect k3d-k3s-default | jq '.[0].IPAM.Config[0].Subnet')

echo $DOCKER_SUBNET
