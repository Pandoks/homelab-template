import { baseName } from "./utils";

const baseImage = new docker.Image("BaseImage", {
  imageName: `${baseName}-base:latest`,
  build: {
    context: "../../",
    dockerfile: "../../Dockerfile",
  },
  skipPush: true,
});

const webImage = new docker.Image(
  "WebImage",
  {
    imageName: `${baseName}-web:latest`,
    build: {
      context: "../../packages/web",
      dockerfile: "../../packages/web/Dockerfile",
      args: {
        BASE: baseImage.imageName,
      },
    },
    skipPush: true,
  },
  { dependsOn: baseImage },
);

const mainDatabaseImage = new docker.Image("MainDatabaseImage", {
  imageName: `${baseName}-main-database:latest`,
  build: {
    context: "../../packages/core/src/database/main",
    dockerfile: "../../packages/core/src/database/main/Dockerfile",
  },
  skipPush: true,
});

const mainRedisImage = new docker.Image("MainRedisImage", {
  imageName: `${baseName}-main-redis:latest`,
  build: {
    context: "../../packages/core/src/redis/main",
    dockerfile: "../../packages/core/src/redis/main/Dockerfile",
  },
  skipPush: true,
});

const dockerNetwork = new docker.Network("DockerNetwork", {
  name: `${baseName}-docker-network`,
});

const webContainer = new docker.Container(
  "Web",
  {
    name: `${baseName}-web`,
    image: webImage.imageName,
    networksAdvanced: [{ name: dockerNetwork.name }],
    ports: [{ internal: 3000, external: 3000 }], // Allow direct access (NOTE: ONLY FOR DEV)
  },
  { dependsOn: [dockerNetwork, webImage], deleteBeforeReplace: true },
);
new sst.x.DevCommand(
  "WebLogs",
  { dev: { command: $interpolate`docker logs --follow ${webContainer.name}` } },
  { dependsOn: webContainer },
);

const mainDatabaseContainer = new docker.Container(
  "MainDatabase",
  {
    name: `${baseName}-main-database`,
    image: mainDatabaseImage.imageName,
    networksAdvanced: [{ name: dockerNetwork.name }],
    ports: [{ internal: 5432, external: 5432 }],
    envs: ["POSTGRES_HOST_AUTH_METHOD=trust"], // Allows no password (NOTE: ONLY FOR DEV)
  },
  { dependsOn: [dockerNetwork, mainDatabaseImage], deleteBeforeReplace: true },
);
new sst.x.DevCommand(
  "MainDatabase",
  {
    dev: {
      command: $interpolate`docker logs --follow ${mainDatabaseContainer.name}`,
    },
  },
  { dependsOn: mainDatabaseContainer },
);
new sst.x.DevCommand(
  "MainDatabaseCLI",
  { dev: { command: $interpolate`psql -p 5432` } },
  { dependsOn: mainDatabaseContainer },
);

const mainRedisContainer = new docker.Container(
  "MainRedis",
  {
    name: `${baseName}-main-redis`,
    image: mainRedisImage.imageName,
    networksAdvanced: [{ name: dockerNetwork.name }],
    ports: [{ internal: 6379, external: 6379 }],
  },
  { dependsOn: [dockerNetwork, mainRedisImage], deleteBeforeReplace: true },
);
new sst.x.DevCommand(
  "MainRedis",
  {
    dev: {
      command: $interpolate`docker logs --follow ${mainRedisContainer.name}`,
    },
  },
  { dependsOn: mainRedisContainer },
);
new sst.x.DevCommand(
  "MainRedisCLI",
  {
    dev: {
      command: $interpolate`redis-cli -p ${mainRedisContainer.ports[0].external}`,
    },
  },
  { dependsOn: mainRedisContainer },
);
