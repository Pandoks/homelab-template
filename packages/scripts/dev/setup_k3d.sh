#!/bin/bash

SCRIPT_DIR=$(dirname $(realpath $0))
PROJECT_ROOT=$SCRIPT_DIR/../../..
DOCKER_SUBNET=$(docker network inspect k3d-local-cluster | jq '.[0].IPAM.Config[0].Subnet')

kubectl apply -f $PROJECT_ROOT/k3s/base/helm-charts/metallb.yaml
until kubectl get deployment metallb-controller -n metallb-system >/dev/null 2>&1; do
  sleep 1
done
kubectl rollout status deployment/metallb-controller -n metallb-system --timeout=300s
env IP_POOL_RANGE=$DOCKER_SUBNET envsubst <$PROJECT_ROOT/k3s/base/metallb-setup.yaml | kubectl apply -f -

kubectl apply -f $PROJECT_ROOT/k3s/base/helm-charts/haproxy-ingress.yaml
until kubectl get deployment haproxy-ingress -n ingress-controller >/dev/null 2>&1; do
  sleep 1
done
kubectl rollout status deployment/haproxy-ingress -n ingress-controller --timeout=300s

kubectl apply -f $PROJECT_ROOT/k3s/base/helm-charts/cert-manager.yaml
until kubectl get deployment cert-manager -n cert-manager >/dev/null 2>&1; do
  sleep 1
done
kubectl rollout status deployment/cert-manager -n cert-manager --timeout=300s
kubectl apply -f $PROJECT_ROOT/k3s/base/cert-manager.yaml

kubectl kustomize $PROJECT_ROOT/k3s/dev --load-restrictor=LoadRestrictionsNone | kubectl apply -f -
