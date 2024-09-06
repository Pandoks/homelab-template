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
        "docker-build": true,
      },
    };
  },
  // Your app's resources
  async run() {
    let outputs = {};
    for (const infraPackage of readdirSync("./infra/")) {
      const result = await import(`./infra/${infraPackage}`);
      if (result.outputs) {
        outputs = { ...outputs, ...result.outputs };
      }
    }
    return outputs;
  },
});
