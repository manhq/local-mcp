import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  ensureSettingsFile,
  getPort,
  getServiceStatuses,
  loadSettings,
  saveSettings,
  ServiceName,
  SERVICE_NAMES,
  SETTINGS_PATH,
} from "./shared/settings.js";

type AgentName = "claude" | "codex" | "cursor" | "vscode" | "windsurf" | "antigravity";
type RegisterTarget = "localmcp" | ServiceName;

const AGENTS: AgentName[] = ["claude", "codex", "cursor", "vscode", "windsurf", "antigravity"];
const REGISTER_TARGETS: RegisterTarget[] = ["localmcp", ...SERVICE_NAMES];

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...args] = argv;

  switch (command) {
    case undefined:
      await import("./index.js").then(({ startServer }) => startServer());
      return;
    case "init":
      handleInit();
      return;
    case "list":
      handleList();
      return;
    case "config":
      await handleConfig(args);
      return;
    case "register":
      await handleRegister(args);
      return;
    case "inspect":
      handleInspect(args);
      return;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return;
    case "--version":
    case "-v":
      printVersion();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

function handleInit(): void {
  const created = ensureSettingsFile();
  console.log(`${created ? "Created" : "Already exists"}: ${SETTINGS_PATH}`);
  console.log("Next: localmcp config");
}

function handleList(): void {
  const rows = getServiceStatuses().map((service) => ({
    service: service.name,
    status: service.enabled ? "enabled" : "missing config",
    endpoint: service.endpoint,
    missing: service.missing.join(", ") || "-",
  }));

  console.table(rows);
}

async function handleConfig(args: string[]): Promise<void> {
  ensureSettingsFile();

  const [serviceName, ...updates] = args;
  if (!serviceName) {
    openEditor(SETTINGS_PATH);
    return;
  }

  if (!SERVICE_NAMES.includes(serviceName as ServiceName)) {
    console.error(`Unknown service: ${serviceName}`);
    console.error(`Available services: ${SERVICE_NAMES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const service = serviceName as ServiceName;
  if (updates.length > 0) {
    updateServiceFromArgs(service, updates);
    return;
  }

  await promptServiceConfig(service);
}

async function handleRegister(args: string[]): Promise<void> {
  const agent = args[0]
    ? validateChoice(args[0], AGENTS, "AI agent")
    : await promptSelect("Select AI agent", AGENTS);
  if (!agent) return;

  const serviceArg = getOption(args, "--service");
  const targetName = serviceArg
    ? validateChoice(serviceArg, REGISTER_TARGETS, "service")
    : await promptSelect("Select service", REGISTER_TARGETS);
  if (!targetName) return;

  const target = getRegistrationTarget(targetName);
  const serverName = targetName;

  if (agent === "claude") {
    spawnAndInherit("claude", ["mcp", "add", "--transport", "http", serverName, target.url]);
    return;
  }

  if (agent === "codex") {
    spawnAndInherit("codex", ["mcp", "add", serverName, "--url", target.url]);
    return;
  }

  registerJsonConfig(agent, serverName, target.url);
}

function handleInspect(_args: string[]): void {
  const target = getRegistrationTarget("localmcp");
  const configPath = join(process.cwd(), ".localmcp-inspector.json");

  writeFileSync(
    configPath,
    `${JSON.stringify({ mcpServers: { localmcp: { url: target.url } } }, null, 2)}\n`
  );

  console.log(`Starting MCP Inspector for ${target.url}`);
  console.log("If npx asks to install @modelcontextprotocol/inspector, approve it once.");
  spawnAndInherit("npx", [
    "@modelcontextprotocol/inspector",
    "--config",
    configPath,
    "--server",
    "localmcp",
  ]);
}

function getRegistrationTarget(target: RegisterTarget): { url: string } {
  const port = getPort();
  if (target === "localmcp") return { url: `http://localhost:${port}/mcp` };
  return { url: `http://localhost:${port}/mcp/${target}` };
}

function registerJsonConfig(agent: AgentName, serverName: string, url: string): void {
  if (agent === "vscode") {
    const path = join(process.cwd(), ".vscode", "mcp.json");
    const config = readJson(path);
    config.servers = { ...(config.servers ?? {}), [serverName]: { type: "http", url } };
    writeJson(path, config);
    console.log(`Registered ${serverName} in ${path}`);
    return;
  }

  if (agent === "cursor") {
    const path = join(process.cwd(), ".cursor", "mcp.json");
    const config = readJson(path);
    config.mcpServers = { ...(config.mcpServers ?? {}), [serverName]: { url } };
    writeJson(path, config);
    console.log(`Registered ${serverName} in ${path}`);
    return;
  }

  const path =
    agent === "windsurf"
      ? join(homedir(), ".codeium", "windsurf", "mcp_config.json")
      : join(homedir(), ".gemini", "config", "mcp_config.json");
  const config = readJson(path);
  config.mcpServers = { ...(config.mcpServers ?? {}), [serverName]: { serverUrl: url } };
  writeJson(path, config);
  console.log(`Registered ${serverName} in ${path}`);
}

async function promptServiceConfig(service: ServiceName): Promise<void> {
  const settings = loadSettings();
  settings.services ??= {};
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    if (service === "figma") {
      const current = settings.services.figma ?? {};
      settings.services.figma = {
        host: await ask(rl, "FIGMA_HOST", current.host ?? "https://api.figma.com/v1"),
        token: await ask(rl, "FIGMA_TOKEN", current.token),
      };
    }

    if (service === "atlassian") {
      const current = settings.services.atlassian ?? {};
      settings.services.atlassian = {
        host: await ask(rl, "ATLASSIAN_HOST", current.host ?? "https://yourcompany.atlassian.net"),
        email: await ask(rl, "ATLASSIAN_EMAIL", current.email),
        apiToken: await ask(rl, "ATLASSIAN_API_TOKEN", current.apiToken),
      };
    }

    if (service === "google-chat") {
      const current = settings.services["google-chat"] ?? {};
      settings.services["google-chat"] = {
        clientId: await ask(rl, "GCHAT_CLIENT_ID", current.clientId),
        clientSecret: await ask(rl, "GCHAT_CLIENT_SECRET", current.clientSecret),
        refreshToken: await ask(rl, "GCHAT_REFRESH_TOKEN", current.refreshToken),
      };
    }
  } finally {
    rl.close();
  }

  saveSettings(settings);
  console.log(`Updated ${service} in ${SETTINGS_PATH}`);
}

function updateServiceFromArgs(service: ServiceName, updates: string[]): void {
  const settings = loadSettings();
  settings.services ??= {};
  const parsed = parseUpdates(updates);

  if (!parsed) {
    process.exitCode = 1;
    return;
  }

  if (service === "figma") {
    settings.services.figma = {
      ...(settings.services.figma ?? {}),
      host: parsed.host ?? parsed.FIGMA_HOST ?? settings.services.figma?.host,
      token: parsed.token ?? parsed.FIGMA_TOKEN ?? settings.services.figma?.token,
    };
  }

  if (service === "atlassian") {
    settings.services.atlassian = {
      ...(settings.services.atlassian ?? {}),
      host: parsed.host ?? parsed.ATLASSIAN_HOST ?? settings.services.atlassian?.host,
      email: parsed.email ?? parsed.ATLASSIAN_EMAIL ?? settings.services.atlassian?.email,
      apiToken:
        parsed.apiToken ??
        parsed.token ??
        parsed.ATLASSIAN_API_TOKEN ??
        settings.services.atlassian?.apiToken,
    };
  }

  if (service === "google-chat") {
    settings.services["google-chat"] = {
      ...(settings.services["google-chat"] ?? {}),
      clientId: parsed.clientId ?? parsed.GCHAT_CLIENT_ID ?? settings.services["google-chat"]?.clientId,
      clientSecret:
        parsed.clientSecret ??
        parsed.GCHAT_CLIENT_SECRET ??
        settings.services["google-chat"]?.clientSecret,
      refreshToken:
        parsed.refreshToken ??
        parsed.GCHAT_REFRESH_TOKEN ??
        settings.services["google-chat"]?.refreshToken,
    };
  }

  saveSettings(settings);
  console.log(`Updated ${service} in ${SETTINGS_PATH}`);
}

function parseUpdates(updates: string[]): Record<string, string> | null {
  const parsed: Record<string, string> = {};

  for (const update of updates) {
    const separator = update.indexOf("=");
    if (separator <= 0) {
      console.error(`Invalid inline config: ${update}`);
      console.error("Use key=value, for example: localmcp config figma token=figd_xxx");
      return null;
    }

    parsed[update.slice(0, separator)] = update.slice(separator + 1);
  }

  return parsed;
}

function getOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function validateChoice<T extends string>(
  value: string,
  choices: readonly T[],
  label: string
): T | null {
  if (choices.includes(value as T)) return value as T;

  console.error(`Unknown ${label}: ${value}`);
  console.error(`Available: ${choices.join(", ")}`);
  process.exitCode = 1;
  return null;
}

async function promptSelect<T extends string>(label: string, choices: readonly T[]): Promise<T | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(label);
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`);
    });

    const answer = (await rl.question("> ")).trim();
    const selectedIndex = Number(answer);

    if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= choices.length) {
      return choices[selectedIndex - 1];
    }

    const selected = choices.find((choice) => choice === answer);
    if (selected) return selected;

    console.error(`Invalid selection: ${answer}`);
    process.exitCode = 1;
    return null;
  } finally {
    rl.close();
  }
}

async function ask(
  rl: ReturnType<typeof createInterface>,
  label: string,
  current: string | undefined
): Promise<string> {
  const suffix = current ? ` (${current})` : "";
  const answer = await rl.question(`${label}${suffix}: `);
  return answer.trim() || current || "";
}

function openEditor(path: string): void {
  const editor = process.env["EDITOR"] ?? process.env["VISUAL"] ?? "vim";
  spawnAndInherit(editor, [path]);
}

function spawnAndInherit(command: string, args: string[]): void {
  const child = spawn(command, args, { stdio: "inherit" });

  child.on("error", (error) => {
    console.error(`Could not run ${command}: ${error.message}`);
    process.exitCode = 1;
  });

  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

function readJson(path: string): Record<string, any> {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
}

function writeJson(path: string, value: Record<string, any>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(): void {
  console.log(`localmcp

Usage:
  localmcp                         Run the MCP server
  localmcp init                    Create ~/localmcp/settings.json
  localmcp list                    List configured services
  localmcp config                  Open settings in vim or $EDITOR
  localmcp config <service>        Configure one service inline
  localmcp register                Select AI agent, then select service
  localmcp register codex --service figma
  localmcp inspect                 Open MCP Inspector
  localmcp --version, -v           Show version

Services:
  ${SERVICE_NAMES.join(", ")}

AI agents:
  ${AGENTS.join(", ")}
`);
}

function printVersion(): void {
  const packagePath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
  console.log(pkg.version ?? "0.0.0");
}
