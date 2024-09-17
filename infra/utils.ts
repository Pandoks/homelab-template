export const baseName = `${$app.stage}-startup-template`;

new sst.x.DevCommand("CoreTests", {
  dev: {
    command: $interpolate`pnpm run test`,
    directory: "./packages/core/",
    autostart: true,
  },
});
