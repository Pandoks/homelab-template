#!/bin/bash

DOCKER_SUBNET=$(docker network inspect k3d-local-cluster | jq '.[0].IPAM.Config[0].Subnet')

echo $DOCKER_SUBNET

SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT=$SCRIPT_DIR/../../..


kubectl apply -f $PROJECT_ROOT/k3s/helm/metallb.yaml
# TODO wait for metallb to finish
kubectl apply -f $PROJECT_ROOT/k3s/base/metallb.yaml

kubectl apply -f $PROJECT_ROOT/k3s/helm/haproxy-ingress.yaml
