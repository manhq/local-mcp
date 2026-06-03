# Atlassian

Tích hợp Jira và Confluence qua Atlassian REST API.

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `ATLASSIAN_HOST` | Có | URL tổ chức, ví dụ `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Có | Email tài khoản Atlassian |
| `ATLASSIAN_API_TOKEN` | Có | API token từ cài đặt tài khoản Atlassian |

Service chỉ được bật khi **cả ba** biến trên có giá trị.

### Lấy API token

1. Vào [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Tạo token mới, sao chép giá trị
3. Điền vào `.env`:
   ```
   ATLASSIAN_HOST=https://yourcompany.atlassian.net
   ATLASSIAN_EMAIL=your@email.com
   ATLASSIAN_API_TOKEN=ATATT3xxxxx
   ```

## Endpoint MCP

```
http://localhost:47001/mcp/atlassian
```

## Đăng ký với AI Agents

**Claude Code** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "url": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.atlassian]
url = "http://localhost:47001/mcp/atlassian"
```

**GitHub Copilot / VS Code** — `.vscode/mcp.json`
```json
{
  "servers": {
    "atlassian": {
      "type": "http",
      "url": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**Cursor** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "url": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "serverUrl": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**Antigravity** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "serverUrl": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

## Danh sách tools

### Jira

| Tool | Mô tả |
|------|-------|
| `getJiraIssue` | Lấy chi tiết issue theo ID hoặc key (ví dụ `PROJECT-123`) |
| `searchJiraIssuesUsingJql` | Tìm kiếm issues bằng JQL |
| `createJiraIssue` | Tạo issue mới trong một project |
| `editJiraIssue` | Cập nhật summary, description, assignee, hoặc priority |
| `transitionJiraIssue` | Chuyển trạng thái workflow (ví dụ sang "In Progress", "Done") |
| `getTransitionsForJiraIssue` | Liệt kê các transitions khả dụng của một issue |
| `addCommentToJiraIssue` | Đăng comment lên issue |
| `addWorklogToJiraIssue` | Ghi nhận thời gian làm việc lên issue |
| `getVisibleJiraProjects` | Liệt kê tất cả projects có quyền truy cập |
| `getJiraProjectIssueTypesMetadata` | Liệt kê các loại issue trong một project |
| `getJiraIssueTypeMetaWithFields` | Lấy metadata fields khi tạo issue theo loại cụ thể |
| `getIssueLinkTypes` | Liệt kê các kiểu liên kết issue (blocks, duplicates, v.v.) |
| `getJiraIssueRemoteIssueLinks` | Liệt kê các link ngoài gắn vào issue (ví dụ trang Confluence) |
| `lookupJiraAccountId` | Tìm account ID của user theo tên hoặc email |

### Confluence

| Tool | Mô tả |
|------|-------|
| `getConfluencePage` | Lấy nội dung trang theo ID |
| `getConfluencePageDescendants` | Liệt kê các trang con của một trang |
| `getConfluencePageFooterComments` | Lấy footer comments của trang |
| `getConfluencePageInlineComments` | Lấy inline comments gắn với đoạn text cụ thể |
| `getConfluenceCommentChildren` | Xem các reply của một comment |
| `getConfluenceSpaces` | Liệt kê tất cả spaces có quyền truy cập |
| `getPagesInConfluenceSpace` | Liệt kê các trang trong một space |
| `createConfluencePage` | Tạo trang mới trong một space |
| `updateConfluencePage` | Cập nhật nội dung hoặc tiêu đề trang (cần số version hiện tại) |
| `createConfluenceFooterComment` | Thêm footer comment hoặc reply vào trang |
| `createConfluenceInlineComment` | Tạo inline comment gắn với đoạn text cụ thể |
| `searchConfluenceUsingCql` | Tìm kiếm nội dung bằng CQL |

## Ví dụ JQL thường dùng

```
# Issues đang làm trong sprint hiện tại
project = PROJ AND sprint in openSprints() AND status = "In Progress"

# Bugs chưa xử lý, ưu tiên cao
project = PROJ AND issuetype = Bug AND priority in (High, Highest) AND status != Done

# Issues được giao cho tôi
assignee = currentUser() AND status != Done ORDER BY created DESC
```

## Ví dụ CQL thường dùng

```
# Tìm trang trong space theo tiêu đề
space = "DEV" AND title ~ "API" AND type = page

# Tìm nội dung được chỉnh sửa gần đây
lastModified > now("-7d") ORDER BY lastModified DESC

# Tìm trang của một người cụ thể
creator = "user@email.com" AND type = page
```
