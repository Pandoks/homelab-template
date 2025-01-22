const webService = new kubernetes.core.v1.Service("WebService", {
  metadata: {
    name: "web",
  },
  spec: {
    ports: [{ port: 3000, targetPort: 3000 }],
    selector: {
      app: "web",
    },
  },
});

const webDeployment = new kubernetes.apps.v1.Deployment("WebDeployment", {
  metadata: {
    name: "web",
  },
  spec: {
    selector: {
      matchLabels: {
        app: "web",
      },
    },
    template: {
      metadata: { labels: { app: "web" } },
      spec: {
        containers: [
          {
            name: "web",
            image: "k3d-homelab-template.localhost:12345/homelab-web:latest",
            ports: [{ containerPort: 3000 }],
          },
        ],
        initContainers: [
          {
            name: "wait-for-dependencies",
            image: "busybox",
            command: [
              "sh",
              "-c",
              `until nc -w 1 maindb 5432 && \
                     nc -w 1 cache 6379; do
                 echo 'waiting for dependencies'
                 sleep 1
               done`,
            ],
          },
        ],
      },
    },
  },
});

const ingressWebRule = new kubernetes.networking.v1.Ingress("IngressWebRule", {
  metadata: {
    name: "ingress-web-rule",
    annotations: {
      "nginx.ingress.kubernetes.io/ssl-redirect": "false",
      "kubernetes.io/ingress.class": "nginx",
    },
  },
  spec: {
    rules: [
      {
        host: "localhost",
        http: {
          paths: [
            {
              path: "/",
              pathType: "Prefix",
              backend: { service: { name: "web", port: { number: 3000 } } },
            },
          ],
        },
      },
    ],
  },
});
