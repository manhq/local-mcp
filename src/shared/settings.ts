import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const SETTINGS_PATH =
  process.env["LOCALMCP_SETTINGS"] ?? join(homedir(), "localmcp", "settings.json");

export const SERVICE_NAMES = ["figma", "atlassian", "google-chat"] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface LocalMcpSettings {
  port?: number;
  services?: {
    figma?: {
      host?: string;
      token?: string;
    };
    atlassian?: {
      host?: string;
      email?: string;
      apiToken?: string;
    };
    "google-chat"?: {
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    };
  };
}

export interface ServiceStatus {
  name: ServiceName;
  enabled: boolean;
  missing: string[];
  endpoint: string;
}

export function loadSettings(): LocalMcpSettings {
  if (!existsSync(SETTINGS_PATH)) return {};

  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8")) as LocalMcpSettings;
  } catch (error) {
    throw new Error(`Cannot read settings at ${SETTINGS_PATH}: ${(error as Error).message}`);
  }
}

export function saveSettings(settings: LocalMcpSettings): void {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
}

export function suggestSettings(): LocalMcpSettings {
  return {
    port: 47001,
    services: {
      figma: {
        host: "https://api.figma.com/v1",
        token: "",
      },
      atlassian: {
        host: "https://yourcompany.atlassian.net",
        email: "you@example.com",
        apiToken: "",
      },
      "google-chat": {
        clientId: "",
        clientSecret: "",
        refreshToken: "",
      },
    },
  };
}

export function ensureSettingsFile(): boolean {
  if (existsSync(SETTINGS_PATH)) return false;

  mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
  saveSettings(suggestSettings());
  return true;
}

export function applySettingsToEnv(settings = loadSettings()): void {
  setEnv("PORT", settings.port?.toString());

  setEnv("FIGMA_HOST", settings.services?.figma?.host);
  setEnv("FIGMA_TOKEN", settings.services?.figma?.token);

  setEnv("ATLASSIAN_HOST", settings.services?.atlassian?.host);
  setEnv("ATLASSIAN_EMAIL", settings.services?.atlassian?.email);
  setEnv("ATLASSIAN_API_TOKEN", settings.services?.atlassian?.apiToken);

  setEnv("GCHAT_CLIENT_ID", settings.services?.["google-chat"]?.clientId);
  setEnv("GCHAT_CLIENT_SECRET", settings.services?.["google-chat"]?.clientSecret);
  setEnv("GCHAT_REFRESH_TOKEN", settings.services?.["google-chat"]?.refreshToken);
}

export function getServiceStatuses(settings = loadSettings()): ServiceStatus[] {
  const port = getPort(settings);

  const services: ServiceStatus[] = [
    {
      name: "figma",
      endpoint: `http://localhost:${port}/mcp/figma`,
      missing: missingEnv([
        ["FIGMA_HOST", settings.services?.figma?.host],
        ["FIGMA_TOKEN", settings.services?.figma?.token],
      ]),
      enabled: false,
    },
    {
      name: "atlassian",
      endpoint: `http://localhost:${port}/mcp/atlassian`,
      missing: missingEnv([
        ["ATLASSIAN_HOST", settings.services?.atlassian?.host],
        ["ATLASSIAN_EMAIL", settings.services?.atlassian?.email],
        ["ATLASSIAN_API_TOKEN", settings.services?.atlassian?.apiToken],
      ]),
      enabled: false,
    },
    {
      name: "google-chat",
      endpoint: `http://localhost:${port}/mcp/google-chat`,
      missing: missingEnv([
        ["GCHAT_CLIENT_ID", settings.services?.["google-chat"]?.clientId],
        ["GCHAT_CLIENT_SECRET", settings.services?.["google-chat"]?.clientSecret],
        ["GCHAT_REFRESH_TOKEN", settings.services?.["google-chat"]?.refreshToken],
      ]),
      enabled: false,
    },
  ];

  return services.map((service) => ({ ...service, enabled: service.missing.length === 0 }));
}

export function getPort(settings = loadSettings()): number {
  return parseInt(process.env["PORT"] ?? settings.port?.toString() ?? "47001", 10);
}

function setEnv(key: string, value: string | undefined): void {
  if (!process.env[key] && value) process.env[key] = value;
}

function missingEnv(entries: Array<[string, string | undefined]>): string[] {
  return entries.filter(([key, value]) => !process.env[key] && !value).map(([key]) => key);
}
