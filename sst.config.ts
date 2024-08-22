/// <reference path="./.sst/platform/config.d.ts" />
// NOTE: DO NOT add imports. use globals `$` or types (https://sst.dev/docs/reference/config)
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
      },
    };
  },
  // Your app's resources
  async run() {
    // Your app's output to the cli/output file
    return {};
  },
});
