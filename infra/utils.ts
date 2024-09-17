export const baseName = `${$app.stage}-startup-template`;

new sst.x.DevCommand("CoreTests", {
  dev: { command: $interpolate`vitest` },
});
