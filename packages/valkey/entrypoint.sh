#!/bin/sh

envsubst </tmp/conf_templates/valkey.conf >/etc/valkey/valkey.conf

if [ "${REPLICAS}" -eq "1" ]; then
  echo "Single node deployment. Skipping cluster initialization"
  exec valkey-server /etc/valkey/valkey.conf
fi

echo "cluster-enabled yes" >>/etc/valkey/valkey.conf
valkey-server /etc/valkey/valkey.conf &

ORDINAL=$(echo ${HOSTNAME} | rev | cut -d'-' -f1 | rev)
PRIMARIES=$(((${REPLICAS} + 1) / 2))
STS_NAME=$(echo "${HOSTNAME}" | sed -E 's/-[0-9]+$//')

echo "Initializing as ordinal $ORDINAL and $PRIMARIES primaries"
if [ "${ORDINAL}" = "0" ]; then
  echo "This is the primary-0 node"

  until valkey-cli -h localhost -p 6379 ping 2>/dev/null; do
    echo "Waiting for local Valkey to start..."
    sleep 2
  done
  echo "Local Valkey is ready"

  if ! valkey-cli -h localhost -p 6379 cluster info 2>/dev/null | grep -q 'cluster_state:ok'; then
    echo "Initializing cluster..."

    NODES=""
    for i in $(seq 0 $((${REPLICAS} - 1))); do
      if [ "$i" = "0" ]; then
        NODES="${NODES} ${POD_IP}:6379"
      else
        NODES="${NODES} ${STS_NAME}-${i}.${STS_NAME}.main.svc.cluster.local:6379"
      fi
    done

    REPLICA_COUNT=$(((${REPLICAS} - ${PRIMARIES}) / ${PRIMARIES}))

    echo "Creating cluster with ${PRIMARIES} primaries and ${REPLICA_COUNT} replicas per primary"
    echo "Creating cluster with nodes: ${NODES}"
    echo "yes" | valkey-cli --cluster create ${NODES} --cluster-replicas ${REPLICA_COUNT}
  else
    echo "Cluster already initialized"
  fi
elif [ "${ORDINAL}" -ge "${PRIMARIES}" ]; then
  PRIMARY_INDEX=$((${ORDINAL} % ${PRIMARIES}))
  PRIMARY_HOST="${STS_NAME}-${PRIMARY_INDEX}.${STS_NAME}.main.svc.cluster.local"

  echo "This is a replica node. Will join cluster via ${PRIMARY_HOST}"
  until valkey-cli -h ${PRIMARY_HOST} -p 6379 ping 2>/dev/null; do
    echo "Waiting for primary ${PRIMARY_HOST} to be ready..."
    sleep 5
  done

  echo "Primary is ready, joining cluster..."
  valkey-cli --cluster add-node ${POD_IP}:6379 ${PRIMARY_HOST}:6379 --cluster-replica
else
  echo "This is a primary node. Will join cluster via valkey-0"
  until valkey-cli -h ${STS_NAME}-0.${STS_NAME}.main.svc.cluster.local -p 6379 ping 2>/dev/null; do
    echo "Waiting for valkey-0 to be ready..."
    sleep 5
  done

  echo "Cluster primary is ready, joining cluster..."
  valkey-cli --cluster add-node ${POD_IP}:6379 ${STS_NAME}-0.${STS_NAME}.main.svc.cluster.local:6379
fi
