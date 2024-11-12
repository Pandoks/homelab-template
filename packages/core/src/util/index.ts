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
