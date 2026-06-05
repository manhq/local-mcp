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

**Claude Code** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "url": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

Or register from the command line:
```bash
claude mcp add --transport http google-chat http://localhost:47001/mcp/google-chat
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.google-chat]
url = "http://localhost:47001/mcp/google-chat"
```

Or register from the command line:
```bash
codex mcp add google-chat --url http://localhost:47001/mcp/google-chat
```

**GitHub Copilot / VS Code** — `.vscode/mcp.json`
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

**Cursor** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "url": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "serverUrl": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

**Antigravity** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "google-chat": {
      "serverUrl": "http://localhost:47001/mcp/google-chat"
    }
  }
}
```

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
