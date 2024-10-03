export const baseName = `${$app.stage}-startup-template`;

export const generateRandomString = (length: number) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";
  for (let i = 0; i < length; i++) {
    randomString += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return randomString;
};

new sst.x.DevCommand("CoreTests", {
  dev: {
    command: $interpolate`pnpm run test`,
    directory: "./packages/core/",
    autostart: true,
  },
});
