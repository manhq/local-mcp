# Local MCP Server

[English](README.md) | [Tiếng Việt](README.vi.md)

Self-hosted MCP server integrating Figma, Jira, and Google Chat for AI agents.

## Requirements

- Node.js 20+ (LTS)
- npm 10+

## Install & Run

```bash
# Install dependencies
npm install

# Create the configuration file
cp .env.example .env
```

Fill credentials in `.env` (see each service doc below), then:

```bash
# Run in dev mode with auto reload
npm run dev

# Build & run production
npm run build
npm start
```

The server runs at `http://localhost:47001` by default.

```bash
# Open MCP Inspector while the server is running
npm run inspect
```

## Flexible Run

If you do not want to open the project every time, register a global command while developing locally:

```bash
npm run build
npm link
localmcp
```

After `npm link`, the `localmcp` command works from any directory.

After publishing to npm, users can install it with:

```bash
npm install -g @manhq/localmcp
localmcp init
localmcp config
localmcp
```

Default settings path:

```bash
~/localmcp/settings.json
```

Main commands:

```bash
localmcp                         # Run the MCP server
localmcp init                    # Create settings for the first time
localmcp list                    # List services and missing variables
localmcp config                  # Open settings with vim or $EDITOR
localmcp config figma            # Configure Figma with inline prompts
localmcp config figma token=figd_xxx
localmcp register                # Select AI agent, then localmcp or a service
localmcp register codex --service figma
localmcp inspect                 # Open MCP Inspector
localmcp --version               # Show version
```

Environment variables still take precedence over the settings file, so quick overrides work:

```bash
PORT=47002 localmcp
```

Publish package:

```bash
npm publish --access=public
```

## Register with AI Agents

**Claude Code** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

Or register from the command line:
```bash
claude mcp add --transport http localmcp http://localhost:47001/mcp
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.localmcp]
url = "http://localhost:47001/mcp"
```

Or register from the command line:
```bash
codex mcp add localmcp --url http://localhost:47001/mcp
```

**GitHub Copilot / VS Code** — `.vscode/mcp.json`
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

**Cursor** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

**Antigravity** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "localmcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

## Health Check

```
GET http://localhost:47001/health
```

Returns the active services and their corresponding endpoints.

---

## Services

| Service | Dedicated endpoint | Docs |
|---------|--------------------|------|
| Figma | `/mcp/figma` | [EN](docs/figma.md) / [VI](docs/vi/figma.md) |
| Atlassian | `/mcp/atlassian` | [EN](docs/atlassian.md) / [VI](docs/vi/atlassian.md) |
| Google Chat | `/mcp/google-chat` | [EN](docs/google-chat.md) / [VI](docs/vi/google-chat.md) |

The `/mcp` endpoint is combined: it exposes every active service through one server.

Each service is enabled only when all required environment variables are present. See each service doc for required variables.

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
  xxx: { register: registerXxxTools, enabled: !!env.xxx },
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
