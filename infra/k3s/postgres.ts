import { generateEnv } from "./env";

const postgresService = new kubernetes.core.v1.Service("MainDatabaseService", {
  metadata: {
    name: "maindb",
  },
  spec: {
    ports: [{ port: 5432, targetPort: 5432 }],
    selector: {
      app: "postgres",
    },
  },
});

const postgresDeployment = new kubernetes.apps.v1.Deployment(
  "MainDatabaseDeployment",
  {
    metadata: {
      name: "postgres",
    },
    spec: {
      selector: {
        matchLabels: {
          app: "postgres",
        },
      },
      template: {
        metadata: { labels: { app: "postgres" } },
        spec: {
          containers: [
            {
              name: "postgres",
              image: "postgres:17-alpine",
              env: generateEnv([
                { name: "POSTGRES_DB", value: "main" },
                { name: "PGDATABASE", value: "main" },
              ]),
              ports: [{ containerPort: 5432 }],
              volumeMounts: [
                {
                  name: "init-sql",
                  mountPath: "/docker-entrypoint-initdb.d/0001_init.sql",
                },
                {
                  name: "roles-sql",
                  mountPath: "/docker-entrypoint-initdb.d/0002_roles.sql",
                },
              ],
              readinessProbe: {
                exec: { command: ["pg_isready", "-U", "admin", "-d", "main"] },
                initialDelaySeconds: 5,
                periodSeconds: 1,
              },
              livenessProbe: {
                exec: { command: ["pg_isready", "-U", "admin", "-d", "main"] },
                initialDelaySeconds: 5,
                periodSeconds: 10,
              },
            },
          ],
          volumes: [
            {
              name: "init-sql",
              hostPath: {
                path: "/postgres/packages/core/src/database/main/setup/0001_init.sql",
                type: "File",
              },
            },
            {
              name: "roles-sql",
              hostPath: {
                path: "/postgres/packages/core/src/database/main/setup/0002_roles.sql",
                type: "File",
              },
            },
          ],
        },
      },
    },
  },
);

export { postgresService, postgresDeployment };
