export const domain = "";
export const zone = cloudflare.getZoneOutput({ name: domain });
