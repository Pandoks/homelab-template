export const alphabet = ({
  options,
  custom,
}: {
  options: string[];
  custom?: string[];
}): string => {
  const capitalized = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  let result = "";
  for (const option of options) {
    switch (option) {
      case "A-Z":
        result += capitalized;
        break;
      case "a-z":
        result += lowercase;
        break;
      case "0-9":
        result += numbers;
        break;
      default:
        break;
    }
  }

  result += custom ? custom.join("") : "";
  return result;
};

export const getAppInfo = (type: "domain" | "origin"): string | undefined => {
  if (process.env.NODE_ENV !== "production") {
    switch (type) {
      case "domain":
        return process.env.PUBLIC_DOMAIN;
      case "origin":
        // PORT is not included in .env file because it's supposed to mimic production environment
        // Pass it in manually when starting applications
        return `http://${process.env.PUBLIC_DOMAIN}:${process.env.PORT}`;
      default:
        return;
    }
  }

  switch (type) {
    case "domain":
      return process.env.PUBLIC_DOMAIN;
    case "origin":
      return `https://${process.env.PUBLIC_DOMAIN}`;
    default:
      return;
  }
};
