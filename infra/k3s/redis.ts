const redisService = new kubernetes.core.v1.Service("MainCache", {
  metadata: {
    name: "cache",
  },
  spec: {
    ports: [{ port: 6379, targetPort: 6379 }],
    selector: {
      app: "redis",
    },
  },
});

const redisDeployment = new kubernetes.apps.v1.Deployment(
  "MainCacheDeployment",
  {
    metadata: {
      name: "redis",
    },
    spec: {
      selector: {
        matchLabels: { app: "redis" },
      },
      template: {
        metadata: {
          labels: { app: "redis" },
        },
        spec: {
          containers: [
            {
              name: "redis",
              image: "redis:7-alpine",
              args: ["--requirepass", "password"],
              ports: [{ containerPort: 6379 }],
              readinessProbe: {
                exec: { command: ["redis-cli", "ping"] },
                initialDelaySeconds: 1,
                periodSeconds: 1,
              },
            },
          ],
        },
      },
    },
  },
);

export { redisService, redisDeployment };
