# Atlassian

[English](atlassian.md) | [Tiếng Việt](vi/atlassian.md)

Integrates Jira and Confluence through the Atlassian REST API.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ATLASSIAN_HOST` | Yes | Organization URL, for example `https://yourcompany.atlassian.net` |
| `ATLASSIAN_EMAIL` | Yes | Atlassian account email |
| `ATLASSIAN_API_TOKEN` | Yes | API token from Atlassian account settings |

The service is enabled only when **all three** variables are set.

### Get an API Token

1. Go to [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new token and copy its value
3. Add it to `.env`:
   ```
   ATLASSIAN_HOST=https://yourcompany.atlassian.net
   ATLASSIAN_EMAIL=your@email.com
   ATLASSIAN_API_TOKEN=ATATT3xxxxx
   ```

## MCP Endpoint

```
http://localhost:47001/mcp/atlassian
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
    "atlassian": {
      "type": "http",
      "url": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**stdio** — `.claude/settings.local.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "atlassian"]
    }
  }
}
```

Or register from the command line:
```bash
# HTTP
claude mcp add --transport http atlassian http://localhost:47001/mcp/atlassian

# stdio
claude mcp add atlassian localmcp stdio atlassian
```

---

### Codex

**HTTP** — `~/.codex/config.toml`
```toml
[mcp_servers.atlassian]
url = "http://localhost:47001/mcp/atlassian"
```

**stdio** — `~/.codex/config.toml`
```toml
[mcp_servers.atlassian]
command = "localmcp"
args = ["stdio", "atlassian"]
```

Or register from the command line:
```bash
# HTTP
codex mcp add atlassian --url http://localhost:47001/mcp/atlassian

# stdio
codex mcp add atlassian localmcp stdio atlassian
```

---

### GitHub Copilot / VS Code

**HTTP** — `.vscode/mcp.json`
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

**stdio** — `.vscode/mcp.json`
```json
{
  "servers": {
    "atlassian": {
      "type": "stdio",
      "command": "localmcp",
      "args": ["stdio", "atlassian"]
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
    "atlassian": {
      "url": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**stdio** — `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "localmcp",
      "args": ["stdio", "atlassian"]
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
    "atlassian": {
      "serverUrl": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**stdio** — `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "localmcp",
      "args": ["stdio", "atlassian"]
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
    "atlassian": {
      "serverUrl": "http://localhost:47001/mcp/atlassian"
    }
  }
}
```

**stdio** — `~/.gemini/config/mcp_config.json`
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "localmcp",
      "args": ["stdio", "atlassian"]
    }
  }
}
```

---

## REST API

Call any Atlassian tool over plain HTTP — useful for scripts and automation.

```bash
# List all tools
GET http://localhost:47001/api/atlassian

# Call a tool
POST http://localhost:47001/api/atlassian/getJiraIssue
Content-Type: application/json

{"issueIdOrKey": "PROJ-123"}

POST http://localhost:47001/api/atlassian/searchJiraIssuesUsingJql
Content-Type: application/json

{"jql": "project = PROJ AND status = \"In Progress\"", "maxResults": 20}
```

Open the interactive playground:
```bash
localmcp playground
# or: open http://localhost:47001/playground
```

---

## Tools

### Jira

| Tool | Description |
|------|-------------|
| `getJiraIssue` | Gets issue details by ID or key, for example `PROJECT-123`. |
| `searchJiraIssuesUsingJql` | Searches issues with JQL. |
| `createJiraIssue` | Creates a new issue or sub-task in a project. For sub-tasks, use a sub-task issue type and provide `parentKey` or `parentId`. Supports `customFields`. |
| `editJiraIssue` | Updates summary, description, assignee, priority, arbitrary fields, or custom fields. |
| `transitionJiraIssue` | Moves an issue through workflow states, for example to "In Progress" or "Done". Supports transition screen fields. |
| `getTransitionsForJiraIssue` | Lists available transitions for an issue. Set `includeFields` to see transition screen fields. |
| `addCommentToJiraIssue` | Adds a comment to an issue. |
| `addWorklogToJiraIssue` | Logs work time on an issue. |
| `getVisibleJiraProjects` | Lists all projects the account can access. |
| `getJiraProjectIssueTypesMetadata` | Lists issue types in a project. |
| `getJiraIssueTypeMetaWithFields` | Gets field metadata for creating a specific issue type. |
| `getJiraIssueEditMetadata` | Gets editable field metadata for an issue. |
| `getJiraFields` | Lists Jira fields and maps display names to IDs such as `customfield_10015`. |
| `getIssueLinkTypes` | Lists issue link types, such as blocks or duplicates. |
| `getJiraIssueRemoteIssueLinks` | Lists external links attached to an issue, for example Confluence pages. |
| `lookupJiraAccountId` | Finds a user's account ID by name or email. |

Update custom fields:

```json
{
  "issueIdOrKey": "PROJ-123",
  "customFields": {
    "customfield_10015": "2026-07-07",
    "customfield_10016": "2026-07-10"
  }
}
```

Complete a transition that requires custom fields:

```json
{
  "issueIdOrKey": "PROJ-123",
  "status": "Done",
  "customFields": {
    "customfield_10015": "2026-07-07",
    "customfield_10016": "2026-07-10"
  }
}
```

Use `getJiraFields` with `{"query":"Target"}` or `getTransitionsForJiraIssue` with `{"includeFields":true}` to find the exact field IDs for display names such as "Target start" and "Target end".

Create a Jira sub-task:

```json
{
  "projectKey": "PROJ",
  "summary": "Implement validation",
  "issueType": "Subtask",
  "parentKey": "PROJ-123"
}
```

### Confluence

| Tool | Description |
|------|-------------|
| `getConfluencePage` | Gets page content by ID. |
| `getConfluencePageDescendants` | Lists child pages for a page. |
| `getConfluencePageFooterComments` | Gets footer comments on a page. |
| `getConfluencePageInlineComments` | Gets inline comments attached to specific text. |
| `getConfluenceCommentChildren` | Shows replies to a comment. |
| `getConfluenceSpaces` | Lists all spaces the account can access. |
| `getPagesInConfluenceSpace` | Lists pages in a space. |
| `createConfluencePage` | Creates a new page in a space. |
| `updateConfluencePage` | Updates page content or title. Requires the current version number. |
| `createConfluenceFooterComment` | Adds a footer comment or reply to a page. |
| `createConfluenceInlineComment` | Creates an inline comment attached to specific text. |
| `searchConfluenceUsingCql` | Searches content with CQL. |

## Common JQL Examples

```
# Issues in progress in the current sprint
project = PROJ AND sprint in openSprints() AND status = "In Progress"

# Unresolved high-priority bugs
project = PROJ AND issuetype = Bug AND priority in (High, Highest) AND status != Done

# Issues assigned to me
assignee = currentUser() AND status != Done ORDER BY created DESC
```

## Common CQL Examples

```
# Find pages in a space by title
space = "DEV" AND title ~ "API" AND type = page

# Find recently edited content
lastModified > now("-7d") ORDER BY lastModified DESC

# Find pages created by a specific user
creator = "user@email.com" AND type = page
```
