import { config } from "dotenv";

config({ path: "../../.env" });

const env = new kubernetes.core.v1.ConfigMap("Env", {
  metadata: {
    name: "env-config",
  },
  data: process.env,
});

export const normalizedEnv = env.data.apply((data) => {
  return Object.keys(data).map((key) => ({ name: key, value: data[key] }));
});

export const generateEnv = (envs: { name: string; value: string }[]) => {
  return normalizedEnv.apply((normalizedEnv) => normalizedEnv.concat(envs));
};
