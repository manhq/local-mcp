import "dotenv/config";

function optionalGroup<T>(keys: string[], build: () => T): T | null {
  if (keys.every((k) => process.env[k])) return build();
  return null;
}

export const env = {
  PORT: parseInt(process.env["PORT"] ?? "47001", 10),

  figma: optionalGroup(["FIGMA_HOST", "FIGMA_TOKEN"], () => ({
    HOST: process.env["FIGMA_HOST"]!,
    TOKEN: process.env["FIGMA_TOKEN"]!,
  })),

  atlassian: optionalGroup(["ATLASSIAN_HOST", "ATLASSIAN_EMAIL", "ATLASSIAN_API_TOKEN"], () => ({
    HOST: process.env["ATLASSIAN_HOST"]!,
    EMAIL: process.env["ATLASSIAN_EMAIL"]!,
    API_TOKEN: process.env["ATLASSIAN_API_TOKEN"]!,
  })),

  gchat: optionalGroup(["GCHAT_CLIENT_ID", "GCHAT_CLIENT_SECRET", "GCHAT_REFRESH_TOKEN"], () => ({
    CLIENT_ID: process.env["GCHAT_CLIENT_ID"]!,
    CLIENT_SECRET: process.env["GCHAT_CLIENT_SECRET"]!,
    REFRESH_TOKEN: process.env["GCHAT_REFRESH_TOKEN"]!,
  })),
};
