# Figma

[English](../figma.md) | [Tiếng Việt](figma.md)

Tích hợp Figma API — cho phép đọc file thiết kế, lấy design tokens, xuất ảnh, và quản lý bình luận.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `FIGMA_HOST` | Có | Địa chỉ API, mặc định `https://api.figma.com/v1` |
| `FIGMA_TOKEN` | Có | Personal access token từ cài đặt tài khoản Figma |

Service chỉ được bật khi **cả hai** biến trên có giá trị.

### Lấy token

1. Vào [Figma Account Settings](https://www.figma.com/settings)
2. Cuộn xuống phần **Personal access tokens** → tạo token mới
3. Điền vào `.env`:
   ```
   FIGMA_HOST=https://api.figma.com/v1
   FIGMA_TOKEN=figd_xxxxxxxxxxxx
   ```

## Endpoint MCP

```
http://localhost:47001/mcp/figma
```

## Đăng ký với AI Agents

Mỗi agent hỗ trợ hai chế độ transport — chọn cái phù hợp với setup của bạn:

- **HTTP** — cần server đang chạy (`localmcp`). Dùng chung giữa các agent.
- **stdio** — agent tự spawn process khi cần. Không cần server chạy sẵn.

Hoặc dùng `localmcp register` để đăng ký tự động.

---

### Claude Code

**HTTP** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**stdio** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "figma": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "figma"]
    }
  }
}
```

Hoặc đăng ký bằng command line:
```bash
# HTTP
claude mcp add --transport http figma http://localhost:47001/mcp/figma

# stdio
claude mcp add figma localmcp stdio figma
```

---

### Codex

**HTTP** — `~/.codex/config.toml`
```toml
[mcp_servers.figma]
url = "http://localhost:47001/mcp/figma"
```

**stdio** — `~/.codex/config.toml`
```toml
[mcp_servers.figma]
command = "localmcp"
args = ["stdio", "figma"]
```

Hoặc đăng ký bằng command line:
```bash
# HTTP
codex mcp add figma --url http://localhost:47001/mcp/figma

# stdio
codex mcp add figma localmcp stdio figma
```

---

### GitHub Copilot / VS Code

**HTTP** — `.vscode/mcp.json`
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

**stdio** — `.vscode/mcp.json`
```json
{
  "servers": {
    "figma": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "figma"]
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
    "figma": {
      "url": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**stdio** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "figma": {
      "command": "localmcp",
      "args": ["stdio", "figma"]
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
    "figma": {
      "serverUrl": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**stdio** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "figma": {
      "command": "localmcp",
      "args": ["stdio", "figma"]
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
    "figma": {
      "serverUrl": "http://localhost:47001/mcp/figma"
    }
  }
}
```

**stdio** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "figma": {
      "command": "localmcp",
      "args": ["stdio", "figma"]
    }
  }
}
```

---

## REST API

Gọi bất kỳ tool Figma nào qua HTTP thông thường — tiện cho script và automation.

```bash
# Liệt kê tất cả tools
GET http://localhost:47001/api/figma

# Gọi một tool
POST http://localhost:47001/api/figma/figma_whoami
Content-Type: application/json

{}

POST http://localhost:47001/api/figma/figma_get_metadata
Content-Type: application/json

{"fileKey": "AbCdEfGh", "depth": 2}
```

Mở interactive playground:
```bash
localmcp playground
# hoặc: open http://localhost:47001/playground
```

---

## Danh sách tools

### File & Node

| Tool | Mô tả |
|------|-------|
| `figma_get_metadata` | Lấy cấu trúc cây của file hoặc một node cụ thể: tên, ID, kiểu, bounding box. Dùng trước khi lấy chi tiết thiết kế. |
| `figma_get_design_context` | Lấy toàn bộ thuộc tính thiết kế của một node: màu sắc, typography, auto-layout, effects, constraints. |

### Bình luận

| Tool | Mô tả |
|------|-------|
| `figma_get_comments` | Lấy tất cả bình luận trong file: nội dung, tác giả, ngày tạo, trạng thái resolved. |
| `figma_post_comment` | Đăng bình luận lên file. Có thể gắn vào node cụ thể qua `nodeId`. |

### Design Tokens

| Tool | Mô tả |
|------|-------|
| `figma_get_variables` | Lấy tất cả biến thiết kế cục bộ trong file: màu, spacing, typography, border-radius, v.v. |
| `figma_get_published_variables` | Lấy các biến thiết kế đã được publish từ file thư viện. |

### Ảnh & Assets

| Tool | Mô tả |
|------|-------|
| `figma_export_image` | Xuất node thành ảnh, trả về URL tải tạm thời. Hỗ trợ PNG, JPG, SVG, PDF. |
| `figma_get_image_fills` | Lấy URL tải ảnh cho tất cả image fills được nhúng trong file. |

### Components & Styles

| Tool | Mô tả |
|------|-------|
| `figma_get_components` | Lấy danh sách components đã publish trong file: tên, mô tả, node ID. |
| `figma_get_component_sets` | Lấy danh sách component sets (nhóm variants) trong file. |
| `figma_get_styles` | Lấy tất cả styles đã publish: color styles, text styles, effect styles, grid styles. |
| `figma_get_team_components` | Lấy components từ tất cả thư viện dùng chung của team. Cần `teamId`. |

### Tài khoản

| Tool | Mô tả |
|------|-------|
| `figma_whoami` | Xem thông tin tài khoản Figma đang được xác thực: tên, email, account ID. |

## Tìm fileKey và nodeId

- **fileKey**: chuỗi trong URL của file Figma, ví dụ `https://www.figma.com/file/`**`AbCdEfGh`**`/Ten-file`
- **nodeId**: có dạng `123:456`, lấy từ URL khi chọn một layer, hoặc dùng `figma_get_metadata` để duyệt cây.
