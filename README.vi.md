# Local MCP Server

[English](README.md) | [Tiếng Việt](README.vi.md)

MCP server tự host, tích hợp Figma, Jira và Google Chat cho các AI agent.

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

## Chạy linh hoạt

Nếu không muốn mở project mỗi lần chạy, có thể đăng ký command global khi đang phát triển local:

```bash
npm run build
npm link
localmcp
```

Sau khi `npm link`, lệnh `localmcp` chạy được ở bất kỳ thư mục nào.

Khi publish lên npm, người dùng có thể cài bằng:

```bash
npm install -g @manhq/localmcp
localmcp init
localmcp config
localmcp
```

Settings mặc định nằm ở:

```bash
~/localmcp/settings.json
```

Các command chính:

```bash
localmcp                         # Chạy MCP server
localmcp init                    # Tạo settings lần đầu
localmcp list                    # Liệt kê services và biến còn thiếu
localmcp config                  # Mở settings bằng vim hoặc $EDITOR
localmcp config figma            # Config riêng service Figma bằng prompt inline
localmcp config figma token=figd_xxx
localmcp register                # Chọn AI agent, sau đó chọn localmcp hoặc service
localmcp register codex --service figma
localmcp inspect                 # Mở MCP Inspector
localmcp --version               # Xem phiên bản
```

Biến môi trường vẫn được ưu tiên cao hơn settings file, nên có thể override nhanh:

```bash
PORT=47002 localmcp
```

Publish package:

```bash
npm publish --access=public
```

## Đăng ký với AI Agents

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

Hoặc đăng ký bằng command line:
```bash
claude mcp add --transport http localmcp http://localhost:47001/mcp
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.localmcp]
url = "http://localhost:47001/mcp"
```

Hoặc đăng ký bằng command line:
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

## Kiểm tra trạng thái

```
GET http://localhost:47001/health
```

Trả về danh sách services đang active và các endpoints tương ứng.

---

## Danh sách services

| Service | Endpoint riêng | Tài liệu |
|---------|---------------|----------|
| Figma | `/mcp/figma` | [EN](docs/figma.md) / [VI](docs/vi/figma.md) |
| Atlassian | `/mcp/atlassian` | [EN](docs/atlassian.md) / [VI](docs/vi/atlassian.md) |
| Google Chat | `/mcp/google-chat` | [EN](docs/google-chat.md) / [VI](docs/vi/google-chat.md) |

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
