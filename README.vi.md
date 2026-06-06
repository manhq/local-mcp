# Local MCP Server

[English](README.md) | [Tiếng Việt](README.vi.md)

MCP server tự host, tích hợp Figma, Jira và Google Chat cho các AI agent.

## Yêu cầu

- Node.js 20+ (LTS)
- npm 10+

## Cài đặt & chạy

```bash
npm install -g @manhq/localmcp
localmcp init     # tạo ~/localmcp/settings.json
localmcp config   # điền credentials
localmcp          # khởi động server
```

Hoặc clone về và chạy local:

```bash
npm install
npm run build
npm link          # đăng ký lệnh `localmcp` global
localmcp
```

Settings mặc định nằm ở: `~/localmcp/settings.json`

Biến môi trường được ưu tiên hơn settings file:

```bash
PORT=47002 localmcp
```

## Các lệnh

```bash
localmcp                         # Chạy MCP server (HTTP)
localmcp stdio                   # Chạy dưới dạng stdio MCP server (tất cả services)
localmcp stdio <service>         # Chạy stdio cho một service cụ thể
localmcp init                    # Tạo settings lần đầu
localmcp list                    # Liệt kê services và biến còn thiếu
localmcp config                  # Mở settings bằng vim hoặc $EDITOR
localmcp config figma            # Config riêng service Figma bằng prompt inline
localmcp config figma token=figd_xxx
localmcp register                # Chọn AI agent, sau đó chọn localmcp hoặc service
localmcp register codex --service figma
localmcp inspect                 # Mở MCP Inspector (HTTP, cần server đang chạy)
localmcp inspect --stdio         # Mở MCP Inspector dùng stdio transport
localmcp playground              # Mở REST API playground trên trình duyệt
localmcp --version               # Xem phiên bản
```

## Endpoints

Khi server đang chạy (`localmcp`):

| Transport | URL |
|-----------|-----|
| Streamable HTTP (tất cả) | `http://localhost:47001/mcp` |
| Streamable HTTP (theo service) | `http://localhost:47001/mcp/<service>` |
| Legacy SSE (tất cả) | `http://localhost:47001/sse` |
| Legacy SSE (theo service) | `http://localhost:47001/sse/<service>` |
| REST API | `http://localhost:47001/api` |
| REST Playground | `http://localhost:47001/playground` |
| Health check | `http://localhost:47001/health` |

## Đăng ký với AI Agents

> **Tip:** Chạy `localmcp register` để đăng ký tự động, hoặc copy lệnh stdio từ log khi khởi động `localmcp`.

Mỗi agent hỗ trợ hai chế độ transport — chọn cái phù hợp với setup của bạn:

- **HTTP** — cần server đang chạy (`localmcp`). Nhanh hơn, dùng chung giữa các agent.
- **stdio** — agent tự spawn process khi cần. Không cần server chạy sẵn, nhưng mỗi agent dùng process riêng.

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

Hoặc đăng ký bằng command line:
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

Hoặc đăng ký bằng command line:
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

REST API cho phép gọi bất kỳ tool nào qua HTTP thông thường — tiện cho script, automation và playground.

```bash
# Liệt kê services
GET http://localhost:47001/api

# Liệt kê tools của một service
GET http://localhost:47001/api/figma
GET http://localhost:47001/api/atlassian

# Gọi một tool
POST http://localhost:47001/api/figma/whoami
POST http://localhost:47001/api/atlassian/getJiraIssue
Content-Type: application/json

{"issueIdOrKey": "PROJ-123"}

# OpenAPI spec
GET http://localhost:47001/api/openapi.json

# Interactive playground
GET http://localhost:47001/playground
```

Hoặc mở playground bằng lệnh:
```bash
localmcp playground
```

---

## Danh sách services

| Service | HTTP endpoint | Tài liệu |
|---------|---------------|----------|
| Figma | `/mcp/figma` | [EN](docs/figma.md) / [VI](docs/vi/figma.md) |
| Atlassian | `/mcp/atlassian` | [EN](docs/atlassian.md) / [VI](docs/vi/atlassian.md) |
| Google Chat | `/mcp/google-chat` | [EN](docs/google-chat.md) / [VI](docs/vi/google-chat.md) |

Endpoint `/mcp` là combined — gộp tất cả services đang active vào một server, tên tool có prefix theo service (`figma_`, `atlassian_`, `gchat_`).

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
  xxx: { register: registerXxxTools, combinedPrefix: "xxx", enabled: !!env.xxx },
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

Tạo `docs/<tên-service>.md` và `docs/vi/<tên-service>.md`, sau đó thêm dòng vào bảng **Danh sách services** ở cả hai README.
