/// <reference path="./.sst/platform/config.d.ts" />
// https://sst.dev/docs/reference/config
import { readdirSync } from "fs";
export default $config({
  // Your app's config
  app(input) {
    return {
      name: "startup-template", // WARN: changing this will create new resources (remove all resources before changing the name)
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: { region: "us-east-2" },
        cloudflare: true,
        "pulumi-stripe": true,
        github: true,
        docker: true,
        digitalocean: true,
      },
    };
  },
  // Your app's resources
  async run() {
    let outputs = {};
    const importFiles = async (dir: string) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = `${dir}/${item.name}`;
        if (item.isDirectory()) {
          await importFiles(path);
        } else if (item.isFile() && item.name.endsWith(".ts")) {
          const result = await import(`./${path}`);
          if (result.outputs) {
            outputs = { ...outputs, ...result.outputs };
          }
        }
      }
    };
    await importFiles("./infra");
    return outputs;
  },
});
