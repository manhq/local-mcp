# Figma

[English](figma.md) | [Tiếng Việt](vi/figma.md)

Integrates the Figma API, allowing agents to read design files, retrieve design tokens, export images, and manage comments.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIGMA_HOST` | Yes | API base URL, defaults to `https://api.figma.com/v1` |
| `FIGMA_TOKEN` | Yes | Personal access token from Figma account settings |

The service is enabled only when **both** variables are set.

### Get a Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens** and create a new token
3. Add it to `.env`:
   ```
   FIGMA_HOST=https://api.figma.com/v1
   FIGMA_TOKEN=figd_xxxxxxxxxxxx
   ```

## MCP Endpoint

```
http://localhost:47001/mcp/figma
```

## Register with AI Agents

**Claude Code** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "figma": {
      "url": "http://localhost:47001/mcp/figma"
    }
  }
}
```

Or register from the command line:
```bash
claude mcp add --transport http figma http://localhost:47001/mcp/figma
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.figma]
url = "http://localhost:47001/mcp/figma"
```

Or register from the command line:
```bash
codex mcp add figma --url http://localhost:47001/mcp/figma
```

**GitHub Copilot / VS Code** — `.vscode/mcp.json`
```json
{
  "servers": {
    "figma": {
      "type": "http",
      "url": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**Cursor** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "figma": {
      "url": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "figma": {
      "serverUrl": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**Antigravity** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "figma": {
      "serverUrl": "http://localhost:47001/mcp/figma"
    }
  }
}
```

## Tools

### File & Node

| Tool | Description |
|------|-------------|
| `figma_get_metadata` | Gets the file tree or a specific node: name, ID, type, and bounding box. Use before reading detailed design data. |
| `figma_get_design_context` | Gets full design properties for a node: colors, typography, auto-layout, effects, and constraints. |

### Comments

| Tool | Description |
|------|-------------|
| `figma_get_comments` | Gets all comments in a file: content, author, creation date, and resolved state. |
| `figma_post_comment` | Posts a comment to a file. Can attach to a specific node via `nodeId`. |

### Design Tokens

| Tool | Description |
|------|-------------|
| `figma_get_variables` | Gets all local design variables in a file: colors, spacing, typography, radius, and more. |
| `figma_get_published_variables` | Gets design variables published from a library file. |

### Images & Assets

| Tool | Description |
|------|-------------|
| `figma_export_image` | Exports a node as an image and returns a temporary download URL. Supports PNG, JPG, SVG, and PDF. |
| `figma_get_image_fills` | Gets download URLs for all image fills embedded in the file. |

### Components & Styles

| Tool | Description |
|------|-------------|
| `figma_get_components` | Gets published components in the file: name, description, and node ID. |
| `figma_get_component_sets` | Gets component sets, meaning variant groups, in the file. |
| `figma_get_styles` | Gets all published styles: color styles, text styles, effect styles, and grid styles. |
| `figma_get_team_components` | Gets components from all shared team libraries. Requires `teamId`. |

### Account

| Tool | Description |
|------|-------------|
| `figma_whoami` | Shows the authenticated Figma account: name, email, and account ID. |

## Find fileKey and nodeId

- **fileKey**: the string in the Figma file URL, for example `https://www.figma.com/file/`**`AbCdEfGh`**`/File-name`
- **nodeId**: usually shaped like `123:456`; get it from the URL after selecting a layer, or use `figma_get_metadata` to browse the tree.
