import { createClient } from "redis";
import { Resource } from "sst";

export const redis = createClient({
  username: Resource.MainRedis.username,
  password: Resource.MainRedis.password,
  socket: {
    host: Resource.MainRedis.host,
    port: Resource.MainRedis.port,
    // tls: true // NOTE: enable for external services
  },
});
