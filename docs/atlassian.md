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

Or register from the command line:
```bash
claude mcp add --transport http atlassian http://localhost:47001/mcp/atlassian
```

**Codex** — `~/.codex/config.toml`
```toml
[mcp_servers.atlassian]
url = "http://localhost:47001/mcp/atlassian"
```

Or register from the command line:
```bash
codex mcp add atlassian --url http://localhost:47001/mcp/atlassian
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

## Tools

### Jira

| Tool | Description |
|------|-------------|
| `getJiraIssue` | Gets issue details by ID or key, for example `PROJECT-123`. |
| `searchJiraIssuesUsingJql` | Searches issues with JQL. |
| `createJiraIssue` | Creates a new issue in a project. |
| `editJiraIssue` | Updates summary, description, assignee, or priority. |
| `transitionJiraIssue` | Moves an issue through workflow states, for example to "In Progress" or "Done". |
| `getTransitionsForJiraIssue` | Lists available transitions for an issue. |
| `addCommentToJiraIssue` | Adds a comment to an issue. |
| `addWorklogToJiraIssue` | Logs work time on an issue. |
| `getVisibleJiraProjects` | Lists all projects the account can access. |
| `getJiraProjectIssueTypesMetadata` | Lists issue types in a project. |
| `getJiraIssueTypeMetaWithFields` | Gets field metadata for creating a specific issue type. |
| `getIssueLinkTypes` | Lists issue link types, such as blocks or duplicates. |
| `getJiraIssueRemoteIssueLinks` | Lists external links attached to an issue, for example Confluence pages. |
| `lookupJiraAccountId` | Finds a user's account ID by name or email. |

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
