const baseImage = new docker.Image("BaseImage", {
  imageName: "startup-template-base:latest",
  build: {
    context: "../../",
    dockerfile: "../../Dockerfile",
  },
  skipPush: true,
});

const webImage = new docker.Image(
  "WebImage",
  {
    imageName: "startup-template-web:latest",
    build: {
      context: "../../packages/web",
      dockerfile: "../../packages/web/Dockerfile",
    },
    skipPush: true,
  },
  { dependsOn: baseImage },
);

const nginxImage = new docker.Image("NginxImage", {
  imageName: "startup-template-nginx:latest",
  build: {
    context: "../../packages/core/src/nginx",
    dockerfile: "../../packages/core/src/nginx/Dockerfile",
  },
  skipPush: true,
});

const mainDatabaseImage = new docker.Image("MainDatabaseImage", {
  imageName: "startup-template-main-database:latest",
  build: {
    context: "../../packages/core/src/database/main",
    dockerfile: "../../packages/core/src/database/main/Dockerfile",
  },
  skipPush: true,
});

const mainRedisImage = new docker.Image("MainRedisImage", {
  imageName: "startup-template-main-redis:latest",
  build: {
    context: "../../packages/core/src/redis/main",
    dockerfile: "../../packages/core/src/redis/main/Dockerfile",
  },
  skipPush: true,
});
