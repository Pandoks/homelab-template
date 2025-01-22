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
        aws: { region: "us-west-1" },
        cloudflare: true,
        "pulumi-stripe": true,
        github: true,
        hcloud: true,
        kubernetes: { renderYamlToDirectory: "../../.k3s" },
      },
    };
  },
  // Your app's resources
  async run() {
    await import("./infra/utils");
    await import("./infra/secrets");

    for (const prodPackage of readdirSync("./infra/prod")) {
      await import(`./infra/prod/${prodPackage}`);
    }

    for (const kubePackage of readdirSync("./infra/k3s")) {
      await import(`./infra/k3s/${kubePackage}`);
    }
  },
});
