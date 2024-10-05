import { baseName } from "./utils";
import { secrets } from "./secrets";
import { domain, origin } from "./dns";

const dockerNetwork = new docker.Network("DockerNetwork", {
  name: `${baseName}-docker-network`,
});

/** ----- MAIN DATABASE ----- */
const mainDatabaseImage = new docker.Image("MainDatabaseImage", {
  imageName: $interpolate`${baseName}-main-database:latest`,
  build: {
    context: "../../packages/core/src/database/main",
    dockerfile: "../../packages/core/src/database/main/Dockerfile",
  },
  skipPush: true,
});
mainDatabaseImage.imageName.apply((name) => console.log(name));
const mainDatabaseContainer = new docker.Container(
  "MainDatabaseContainer",
  {
    name: `${baseName}-main-database`,
    image: mainDatabaseImage.id,
    networksAdvanced: [{ name: dockerNetwork.name }],
    ports: [{ internal: 5432, external: 5432 }],
    envs: [
      "POSTGRES_HOST_AUTH_METHOD=trust", // Allows no password (NOTE: ONLY FOR DEV)
      `POSTGRES_DB=${baseName}-main-database`,
      $interpolate`POSTGRES_USER=${secrets.MainDatabase.Username}`,
      $interpolate`POSTGRES_PASSWORD=${secrets.MainDatabase.Password}`,
    ],
  },
  { dependsOn: [dockerNetwork, mainDatabaseImage], deleteBeforeReplace: true },
);
new sst.Linkable("MainDatabase", {
  properties: {
    username: secrets.MainDatabase.Username.value,
    password: secrets.MainDatabase.Password.value,
    name: `${baseName}-main-database`,
    port: 5432,
    host: mainDatabaseContainer.name,
  },
});
new sst.x.DevCommand(
  "MainDatabaseLogs",
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

/** ----- MAIN REDIS CACHE ----- */
const mainRedisImage = new docker.Image("MainRedisImage", {
  imageName: $interpolate`${baseName}-main-redis:latest`,
  build: {
    context: "../../packages/core/src/redis/main",
    dockerfile: "../../packages/core/src/redis/main/Dockerfile",
  },
  skipPush: true,
});
const mainRedisContainer = new docker.Container(
  "MainRedisContainer",
  {
    name: `${baseName}-main-redis`,
    image: mainRedisImage.id,
    networksAdvanced: [{ name: dockerNetwork.name }],
    ports: [{ internal: 6379, external: 6379 }],
  },
  { dependsOn: [dockerNetwork, mainRedisImage], deleteBeforeReplace: true },
);
export const mainRedis = new sst.Linkable("MainRedis", {
  properties: {
    username: secrets.MainRedis.Username.value,
    password: secrets.MainRedis.Password.value,
    host: mainRedisContainer.name,
    port: 6379,
  },
});
new sst.x.DevCommand(
  "MainRedisLogs",
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

/** ----- BASE IMAGE ----- */
const baseImage = new docker.Image("BaseImage", {
  imageName: `${baseName}-base:latest`,
  build: {
    context: "../../",
    dockerfile: "../../Dockerfile",
    args: {
      MAIN_REDIS_PORT: mainRedisContainer.ports[0].external.apply((port) => port.toString()),
      MAIN_REDIS_HOST:
      MAIN_REDIS_USERNAME:
      MAIN_REDIS_PASSWORD:
      PUBLIC_DOMAIN: domain,
      PUBLIC_ORIGIN: origin,
      PUBLIC_APP_NAME: $app.name,
    },
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

const webContainer = new docker.Container(
  "WebContainer",
  {
    name: `${baseName}-web`,
    image: webImage.id,
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

