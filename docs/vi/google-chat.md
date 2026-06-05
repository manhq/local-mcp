# Google Chat

[English](../google-chat.md) | [Tiếng Việt](google-chat.md)

Tích hợp Google Chat API — tìm kiếm conversations, đọc và gửi tin nhắn. Tool set tương đương [Google Chat MCP server](https://developers.google.com/workspace/chat/api/reference/mcp) chính thức.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `GCHAT_CLIENT_ID` | Có | OAuth 2.0 Client ID |
| `GCHAT_CLIENT_SECRET` | Có | OAuth 2.0 Client Secret |
| `GCHAT_REFRESH_TOKEN` | Có | OAuth 2.0 Refresh Token |

Service chỉ được bật khi **cả ba** biến trên có giá trị.

### Lấy credentials

1. Vào [Google Cloud Console](https://console.cloud.google.com) → tạo hoặc chọn project
2. Bật **Google Chat API**
3. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost`
4. Sao chép **Client ID** và **Client Secret**
5. Lấy Refresh Token — chạy OAuth flow với các scopes sau:
   ```
   https://www.googleapis.com/auth/chat.spaces.readonly
   https://www.googleapis.com/auth/chat.messages.readonly
   https://www.googleapis.com/auth/chat.messages.create
   ```
6. Điền vào `.env`:
   ```
   GCHAT_CLIENT_ID=xxxx.apps.googleusercontent.com
   GCHAT_CLIENT_SECRET=GOCSPX-xxxx
   GCHAT_REFRESH_TOKEN=1//xxxx
   ```

## Endpoint MCP

```
http://localhost:47001/mcp/google-chat
```

## Đăng ký với AI Agents

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

Hoặc đăng ký bằng command line:
```bash
claude mcp add --transport http google-chat http://localhost:47001/mcp/google-chat
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.google-chat]
url = "http://localhost:47001/mcp/google-chat"
```

Hoặc đăng ký bằng command line:
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

## Danh sách tools

| Tool | Mô tả |
|------|-------|
| `search_conversations` | Tìm kiếm spaces, DMs, group DMs theo tên hoặc danh sách participants |
| `list_messages` | Lấy tin nhắn từ một conversation. Có thể lọc theo thread, khoảng thời gian, hỗ trợ phân trang |
| `search_messages` | Tìm kiếm tin nhắn theo keywords, sender, thời gian, mention, v.v. |
| `send_message` | Gửi tin nhắn vào một conversation. Hỗ trợ reply vào thread cụ thể |

## Lấy conversationId và threadId

- **conversationId**: resource name của space, dạng `spaces/AAAAAAA`. Lấy bằng `search_conversations`.
- **threadId**: resource name của thread, dạng `spaces/AAAAAAA/threads/BBBBBBB`. Lấy từ field `thread.name` trong kết quả `list_messages`.
