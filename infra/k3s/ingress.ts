const ingressLoadBalancer = new kubernetes.core.v1.Service(
  "IngressLoadBalancer",
  {
    metadata: {
      name: "ingress-nginx-lb",
    },
    spec: {
      type: "LoadBalancer",
      selector: {
        "app.kubernetes.io/component": "controller",
        "app.kubernetes.io/instance": "ingress-nginx",
        "app.kubernetes.io/name": "ingress-nginx",
      },
      ports: [
        { name: "http", port: 80, protocol: "TCP", targetPort: 80 },
        { name: "https", port: 443, protocol: "TCP", targetPort: 443 },
      ],
    },
  },
);
