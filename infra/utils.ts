export const baseName = `${$app.stage}-homelab-template`;

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
