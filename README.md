# Local MCP Server

MCP server tự host, tích hợp Figma, Jira và Google Chat cho Claude Code.

## Yêu cầu

- Node.js 20+ (LTS)
- npm 10+

## Cài đặt & chạy

```bash
# Cài dependencies
npm install

# Tạo file cấu hình
cp .env.example .env
```

Điền credentials vào `.env` (xem tài liệu từng service bên dưới), sau đó:

```bash
# Chạy ở chế độ dev (tự reload khi sửa code)
npm run dev

# Build & chạy production
npm run build
npm start
```

Server mặc định chạy tại `http://localhost:47001`.

```bash
# Mở MCP Inspector (chạy song song với server)
npm run inspect
```

## Đăng ký với AI Agents

**Claude Code** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "local-mcp": {
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.local-mcp]
url = "http://localhost:47001/mcp"
```

**GitHub Copilot / VS Code** — `.vscode/mcp.json`
```json
{
  "servers": {
    "local-mcp": {
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
    "local-mcp": {
      "url": "http://localhost:47001/mcp"
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "local-mcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

**Antigravity** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "local-mcp": {
      "serverUrl": "http://localhost:47001/mcp"
    }
  }
}
```

## Kiểm tra trạng thái

```
GET http://localhost:47001/health
```

Trả về danh sách services đang active và các endpoints tương ứng.

---

## Danh sách services

| Service | Endpoint riêng | Tài liệu |
|---------|---------------|----------|
| Figma | `/mcp/figma` | [docs/figma.md](docs/figma.md) |
| Atlassian | `/mcp/atlassian` | [docs/atlassian.md](docs/atlassian.md) |
| Google Chat | `/mcp/google-chat` | [docs/google-chat.md](docs/google-chat.md) |

Endpoint `/mcp` là combined — gộp tất cả services đang active vào một server.

Mỗi service chỉ được bật khi đủ biến môi trường. Xem tài liệu từng service để biết biến nào cần thiết.

---

## Thêm service mới

### 1. Tạo cấu trúc thư mục

```
src/services/<tên-service>/
  index.ts          # export registerXxxTools(server)
  client.ts         # axios client hoặc SDK wrapper
  types.ts          # TypeScript types
  tools/
    <feature>.ts    # đăng ký tool với server.registerTool(...)
```

### 2. Đăng ký vào service registry

Mở `src/index.ts`, thêm vào `SERVICE_REGISTRY`:

```ts
import { registerXxxTools } from "./services/xxx/index.js";

const SERVICE_REGISTRY = {
  // ...services hiện có...
  xxx: { register: registerXxxTools, enabled: !!env.xxx },
};
```

### 3. Thêm biến môi trường

Mở `src/shared/env.ts`, thêm optional group mới:

```ts
export const env = {
  // ...
  xxx: optionalGroup(["XXX_API_KEY"], () => ({
    API_KEY: process.env["XXX_API_KEY"]!,
  })),
};
```

Thêm vào `.env.example`:

```
XXX_API_KEY=
```

### 4. Viết tài liệu

Tạo `docs/<tên-service>.md` theo mẫu các service hiện có, sau đó thêm dòng vào bảng **Danh sách services** ở README này.
