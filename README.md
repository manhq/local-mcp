# Local MCP Server

[English](README.md) | [Tiếng Việt](README.vi.md)

Self-hosted MCP server integrating Figma, Jira, and Google Chat for AI agents.

## Requirements

- Node.js 20+ (LTS)
- npm 10+

## Install & Run

```bash
npm install -g @manhq/localmcp
localmcp init     # create ~/localmcp/settings.json
localmcp config   # fill in credentials
localmcp          # start the server
```

Or clone and run locally:

```bash
npm install
npm run build
npm link          # makes `localmcp` available globally
localmcp
```

Default settings path: `~/localmcp/settings.json`

Environment variables take precedence over the settings file:

```bash
PORT=47002 localmcp
```

## Commands

```bash
localmcp                         # Run the MCP server (HTTP)
localmcp stdio                   # Run as stdio MCP server (combined)
localmcp stdio <service>         # Run as stdio MCP server for one service
localmcp init                    # Create settings for the first time
localmcp list                    # List services and missing variables
localmcp config                  # Open settings with vim or $EDITOR
localmcp config figma            # Configure Figma with inline prompts
localmcp config figma token=figd_xxx
localmcp register                # Select AI agent, then localmcp or a service
localmcp register codex --service figma
localmcp inspect                 # Open MCP Inspector (HTTP, server must be running)
localmcp inspect --stdio         # Open MCP Inspector using stdio transport
localmcp playground              # Open REST API playground in browser
localmcp --version               # Show version
```

## Endpoints

When the server is running (`localmcp`):

| Transport | URL |
|-----------|-----|
| Streamable HTTP (combined) | `http://localhost:47001/mcp` |
| Streamable HTTP (per service) | `http://localhost:47001/mcp/<service>` |
| Legacy SSE (combined) | `http://localhost:47001/sse` |
| Legacy SSE (per service) | `http://localhost:47001/sse/<service>` |
| REST API | `http://localhost:47001/api` |
| REST Playground | `http://localhost:47001/playground` |
| Health check | `http://localhost:47001/health` |

## Register with AI Agents

> **Tip:** Run `localmcp register` to register automatically, or use `localmcp` startup log to copy stdio commands.

Each agent supports two transport modes — choose the one that fits your setup:

- **HTTP** — requires the server to be running (`localmcp`). Faster, shared across agents.
- **stdio** — agent spawns the process on demand. No server needed, but each agent gets its own process.

---

### Claude Code

**HTTP** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "type": "http",
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**stdio** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio"]
    }
  }
}
```

Or register from the command line:
```bash
# HTTP
claude mcp add --transport http localmcp http://localhost:47001/mcp

# stdio
claude mcp add localmcp localmcp stdio
```

---

### Codex

**HTTP** — `~/.codex/config.toml`
```toml
[mcp_servers.localmcp]
url = "http://localhost:47001/mcp"
```

**stdio** — `~/.codex/config.toml`
```toml
[mcp_servers.localmcp]
command = "localmcp"
args = ["stdio"]
```

Or register from the command line:
```bash
# HTTP
codex mcp add localmcp --url http://localhost:47001/mcp

# stdio
codex mcp add localmcp localmcp stdio
```

---

### GitHub Copilot / VS Code

**HTTP** — `.vscode/mcp.json`
```json
{
  "servers": {
    "localmcp": {
      "type": "http",
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**stdio** — `.vscode/mcp.json`
```json
{
  "servers": {
    "localmcp": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio"]
    }
  }
}
```

---

### Cursor

**HTTP** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**stdio** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "command": "localmcp",
      "args": ["stdio"]
    }
  }
}
```

---

### Windsurf

**HTTP** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

**stdio** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "command": "localmcp",
      "args": ["stdio"]
    }
  }
}
```

---

### Antigravity

**HTTP** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

**stdio** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "command": "localmcp",
      "args": ["stdio"]
    }
  }
}
```

---

## REST API

The REST API lets you call any tool over plain HTTP — useful for scripts, automation, and the playground.

```bash
# List services
GET http://localhost:47001/api

# List tools for a service
GET http://localhost:47001/api/figma
GET http://localhost:47001/api/atlassian

# Call a tool
POST http://localhost:47001/api/figma/whoami
POST http://localhost:47001/api/atlassian/getJiraIssue
Content-Type: application/json

{"issueIdOrKey": "PROJ-123"}

# OpenAPI spec
GET http://localhost:47001/api/openapi.json

# Interactive playground
GET http://localhost:47001/playground
```

Or open the playground with:
```bash
localmcp playground
```

---

## Services

| Service | HTTP endpoint | Docs |
|---------|---------------|------|
| Figma | `/mcp/figma` | [EN](docs/figma.md) / [VI](docs/vi/figma.md) |
| Atlassian | `/mcp/atlassian` | [EN](docs/atlassian.md) / [VI](docs/vi/atlassian.md) |
| Google Chat | `/mcp/google-chat` | [EN](docs/google-chat.md) / [VI](docs/vi/google-chat.md) |

The `/mcp` endpoint is combined — it exposes every active service through one server, with tool names prefixed by service (`figma_`, `atlassian_`, `gchat_`).

Each service is enabled only when all required environment variables are present.

---

## Add a New Service

### 1. Create the Folder Structure

```
src/services/<service-name>/
  index.ts          # exports registerXxxTools(server)
  client.ts         # axios client or SDK wrapper
  types.ts          # TypeScript types
  tools/
    <feature>.ts    # registers tools with server.registerTool(...)
```

### 2. Register it in the Service Registry

Open `src/index.ts`, then add it to `SERVICE_REGISTRY`:

```ts
import { registerXxxTools } from "./services/xxx/index.js";

const SERVICE_REGISTRY = {
  // ...existing services...
  xxx: { register: registerXxxTools, combinedPrefix: "xxx", enabled: !!env.xxx },
};
```

### 3. Add Environment Variables

Open `src/shared/env.ts`, then add a new optional group:

```ts
export const env = {
  // ...
  xxx: optionalGroup(["XXX_API_KEY"], () => ({
    API_KEY: process.env["XXX_API_KEY"]!,
  })),
};
```

Add it to `.env.example`:

```
XXX_API_KEY=
```

### 4. Write Documentation

Create `docs/<service-name>.md` and `docs/vi/<service-name>.md`, then add the service to the **Services** table in both README files.
