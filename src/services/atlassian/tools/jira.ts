import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getJiraClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { JiraIssue, JiraTransition, JiraUser } from "../types.js";

export function registerJiraTools(server: McpServer): void {
  server.registerTool(
    "getJiraIssue",
    {
      description: "Retrieve a Jira issue by its ID or key (e.g. PROJECT-123). Returns summary, status, assignee, priority, and description.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key, e.g. 'PROJECT-123'"),
      }),
    },
    async ({ issueIdOrKey }) => {
      try {
        const { data } = await getJiraClient().get<JiraIssue>(`/issue/${issueIdOrKey}`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "searchJiraIssuesUsingJql",
    {
      description: "Search Jira issues using JQL (Jira Query Language). Example: 'project = PROJ AND status = \"In Progress\"'.",
      inputSchema: z.object({
        jql: z.string().describe("JQL query string"),
        maxResults: z.number().int().positive().max(100).default(20).describe("Max results (default 20)"),
      }),
    },
    async ({ jql, maxResults }) => {
      try {
        const { data } = await getJiraClient().post("/issue/search", {
          jql, maxResults,
          fields: ["summary", "status", "assignee", "priority", "issuetype", "created", "updated"],
        });
        return toTextResponse({ total: data.total, issues: data.issues });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "createJiraIssue",
    {
      description: "Create a new Jira issue in a project. Returns the created issue key and URL.",
      inputSchema: z.object({
        projectKey: z.string().describe("Project key, e.g. 'PROJ'"),
        summary: z.string().describe("Issue title/summary"),
        issueType: z.string().default("Task").describe("Issue type: 'Task', 'Bug', 'Story', etc."),
        description: z.string().optional().describe("Issue description (plain text)"),
        assigneeAccountId: z.string().optional().describe("Assignee account ID"),
      }),
    },
    async ({ projectKey, summary, issueType, description, assigneeAccountId }) => {
      try {
        const fields: Record<string, unknown> = {
          project: { key: projectKey },
          summary,
          issuetype: { name: issueType },
        };
        if (description) {
          fields.description = {
            type: "doc", version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
          };
        }
        if (assigneeAccountId) fields.assignee = { accountId: assigneeAccountId };

        const { data } = await getJiraClient().post<{ id: string; key: string; self: string }>("/issue", { fields });
        return toTextResponse({ id: data.id, key: data.key, url: data.self });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "editJiraIssue",
    {
      description: "Modify field values of an existing Jira issue: summary, description, assignee, or priority.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        summary: z.string().optional().describe("New summary"),
        description: z.string().optional().describe("New description (plain text)"),
        assigneeAccountId: z.string().optional().describe("New assignee account ID"),
        priority: z.string().optional().describe("Priority name, e.g. 'High', 'Medium', 'Low'"),
      }),
    },
    async ({ issueIdOrKey, summary, description, assigneeAccountId, priority }) => {
      try {
        const fields: Record<string, unknown> = {};
        if (summary) fields.summary = summary;
        if (description) {
          fields.description = {
            type: "doc", version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: description }] }],
          };
        }
        if (assigneeAccountId) fields.assignee = { accountId: assigneeAccountId };
        if (priority) fields.priority = { name: priority };

        await getJiraClient().put(`/issue/${issueIdOrKey}`, { fields });
        return toTextResponse({ success: true, issueIdOrKey });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "transitionJiraIssue",
    {
      description: "Execute a workflow state change on a Jira issue, e.g. move to 'In Progress' or 'Done'.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        status: z.string().describe("Target status name, e.g. 'In Progress', 'Done'"),
      }),
    },
    async ({ issueIdOrKey, status }) => {
      try {
        const { data } = await getJiraClient().get<{ transitions: JiraTransition[] }>(
          `/issue/${issueIdOrKey}/transitions`
        );
        const transition = data.transitions.find(t => t.name.toLowerCase() === status.toLowerCase());
        if (!transition) {
          const available = data.transitions.map(t => t.name).join(", ");
          return toTextResponse(`Status "${status}" not found. Available: ${available}`);
        }
        await getJiraClient().post(`/issue/${issueIdOrKey}/transitions`, { transition: { id: transition.id } });
        return toTextResponse({ success: true, issueIdOrKey, status });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getTransitionsForJiraIssue",
    {
      description: "List all available workflow transitions for a Jira issue.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
      }),
    },
    async ({ issueIdOrKey }) => {
      try {
        const { data } = await getJiraClient().get<{ transitions: JiraTransition[] }>(
          `/issue/${issueIdOrKey}/transitions`
        );
        return toTextResponse(data.transitions);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "addCommentToJiraIssue",
    {
      description: "Post a comment on a Jira issue.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        comment: z.string().describe("Comment text"),
      }),
    },
    async ({ issueIdOrKey, comment }) => {
      try {
        const { data } = await getJiraClient().post(`/issue/${issueIdOrKey}/comment`, {
          body: {
            type: "doc", version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
          },
        });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "addWorklogToJiraIssue",
    {
      description: "Record a time tracking entry on a Jira issue.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        timeSpent: z.string().describe("Time spent, e.g. '1h 30m', '2h', '30m'"),
        comment: z.string().optional().describe("Optional work description"),
      }),
    },
    async ({ issueIdOrKey, timeSpent, comment }) => {
      try {
        const body: Record<string, unknown> = { timeSpent };
        if (comment) {
          body.comment = {
            type: "doc", version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
          };
        }
        const { data } = await getJiraClient().post(`/issue/${issueIdOrKey}/worklog`, body);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getVisibleJiraProjects",
    {
      description: "List all Jira projects the current user has access to.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { data } = await getJiraClient().get("/project");
        return toTextResponse(
          (data as Array<{ key: string; name: string; projectTypeKey: string }>).map(p => ({
            key: p.key, name: p.name, type: p.projectTypeKey,
          }))
        );
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getJiraProjectIssueTypesMetadata",
    {
      description: "List all issue types available in a Jira project.",
      inputSchema: z.object({
        projectKey: z.string().describe("Project key"),
      }),
    },
    async ({ projectKey }) => {
      try {
        const { data } = await getJiraClient().get(`/issue/createmeta/${projectKey}/issuetypes`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getJiraIssueTypeMetaWithFields",
    {
      description: "Get field metadata for creating issues of a specific type in a project.",
      inputSchema: z.object({
        projectKey: z.string().describe("Project key"),
        issueTypeId: z.string().describe("Issue type ID"),
      }),
    },
    async ({ projectKey, issueTypeId }) => {
      try {
        const { data } = await getJiraClient().get(`/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getIssueLinkTypes",
    {
      description: "Retrieve all available issue link types (e.g. 'blocks', 'duplicates', 'is cloned by').",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { data } = await getJiraClient().get("/issueLinkType");
        return toTextResponse(data.issueLinkTypes);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getJiraIssueRemoteIssueLinks",
    {
      description: "List external links (e.g. Confluence pages) attached to a Jira issue.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
      }),
    },
    async ({ issueIdOrKey }) => {
      try {
        const { data } = await getJiraClient().get(`/issue/${issueIdOrKey}/remotelink`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "lookupJiraAccountId",
    {
      description: "Find Jira user account IDs by display name or email address.",
      inputSchema: z.object({
        query: z.string().describe("Name or email to search for"),
      }),
    },
    async ({ query }) => {
      try {
        const { data } = await getJiraClient().get<JiraUser[]>("/user/search", { params: { query } });
        return toTextResponse(data.map(u => ({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress: u.emailAddress,
        })));
      } catch (error) { return handleToolError(error); }
    }
  );
}
