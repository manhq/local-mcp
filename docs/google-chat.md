# Google Chat

[English](google-chat.md) | [Tiếng Việt](vi/google-chat.md)

Integrates the Google Chat API to search conversations, read messages, and send messages. The tool set is equivalent to the official [Google Chat MCP server](https://developers.google.com/workspace/chat/api/reference/mcp).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCHAT_CLIENT_ID` | Yes | OAuth 2.0 Client ID |
| `GCHAT_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret |
| `GCHAT_REFRESH_TOKEN` | Yes | OAuth 2.0 Refresh Token |

The service is enabled only when **all three** variables are set.

### Get Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com), then create or select a project
2. Enable **Google Chat API**
3. Go to **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost`
4. Copy **Client ID** and **Client Secret**
5. Get a Refresh Token by running an OAuth flow with these scopes:
   ```
   https://www.googleapis.com/auth/chat.spaces.readonly
   https://www.googleapis.com/auth/chat.messages.readonly
   https://www.googleapis.com/auth/chat.messages.create
   ```
6. Add credentials to `.env`:
   ```
   GCHAT_CLIENT_ID=xxxx.apps.googleusercontent.com
   GCHAT_CLIENT_SECRET=GOCSPX-xxxx
   GCHAT_REFRESH_TOKEN=1//xxxx
   ```

## MCP Endpoint

```
http://localhost:47001/mcp/google-chat
```

## Register with AI Agents

Each agent supports two transports — pick whichever fits your setup:

- **HTTP** — requires the server to be running (`localmcp`). Shared across agents.
- **stdio** — the agent spawns the process on demand. No running server needed.

Or use `localmcp register` to set up automatically.

---

### Claude Code

**HTTP** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "type": "http",
      "url": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**stdio** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "google-chat"]
    }
  }
}
```

Or register from the command line:
```bash
# HTTP
claude mcp add --transport http google-chat http://localhost:47001/mcp/google-chat

# stdio
claude mcp add google-chat localmcp stdio google-chat
```

---

### Codex

**HTTP** — `~/.codex/config.toml`
```toml
[mcp_servers.google-chat]
url = "http://localhost:47001/mcp/google-chat"
```

**stdio** — `~/.codex/config.toml`
```toml
[mcp_servers.google-chat]
command = "localmcp"
args = ["stdio", "google-chat"]
```

Or register from the command line:
```bash
# HTTP
codex mcp add google-chat --url http://localhost:47001/mcp/google-chat

# stdio
codex mcp add google-chat localmcp stdio google-chat
```

---

### GitHub Copilot / VS Code

**HTTP** — `.vscode/mcp.json`
```json
{
  "servers": {
    "google-chat": {
      "type": "http",
      "url": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**stdio** — `.vscode/mcp.json`
```json
{
  "servers": {
    "google-chat": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "google-chat"]
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
    "google-chat": {
      "url": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**stdio** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "command": "localmcp",
      "args": ["stdio", "google-chat"]
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
    "google-chat": {
      "serverUrl": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**stdio** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "command": "localmcp",
      "args": ["stdio", "google-chat"]
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
    "google-chat": {
      "serverUrl": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**stdio** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "command": "localmcp",
      "args": ["stdio", "google-chat"]
    }
  }
}
```

---

## REST API

Call any Google Chat tool over plain HTTP — useful for scripts and automation.

```bash
# List all tools
GET http://localhost:47001/api/google-chat

# Call a tool
POST http://localhost:47001/api/google-chat/search_conversations
Content-Type: application/json

{"query": "team standup"}

POST http://localhost:47001/api/google-chat/send_message
Content-Type: application/json

{"conversationId": "spaces/AAAAAAA", "text": "Hello from the REST API!"}
```

Open the interactive playground:
```bash
localmcp playground
# or: open http://localhost:47001/playground
```

---

## Tools

| Tool | Description |
|------|-------------|
| `search_conversations` | Searches spaces, DMs, and group DMs by name or participant list. |
| `list_messages` | Gets messages from a conversation. Supports filtering by thread, time range, and pagination. |
| `search_messages` | Searches messages by keywords, sender, time, mention, and more. |
| `send_message` | Sends a message to a conversation. Supports replying to a specific thread. |

## Get conversationId and threadId

- **conversationId**: the space resource name, shaped like `spaces/AAAAAAA`. Get it with `search_conversations`.
- **threadId**: the thread resource name, shaped like `spaces/AAAAAAA/threads/BBBBBBB`. Get it from `thread.name` in `list_messages` results.
