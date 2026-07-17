import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getJiraClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { JiraIssue, JiraTransition, JiraUser } from "../types.js";

const jiraFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);

const jiraFieldsSchema = z.record(z.string(), jiraFieldValueSchema);

const jiraCustomFieldsSchema = z.record(
  z.string().regex(/^customfield_\d+$/, "Use Jira custom field IDs like customfield_10015."),
  jiraFieldValueSchema
);

export function registerJiraTools(server: McpServer, prefix?: string): void {
  const p = (name: string) => (prefix ? `${prefix}_${name}` : name);

  server.registerTool(
    p("getJiraIssue"),
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
    p("getJiraAttachmentContent"),
    {
      description: "Download the content of a Jira attachment by its ID (from getJiraIssue attachment metadata). Returns text content for text-based files, or base64-encoded content for binary files, along with filename, mimeType, and size.",
      inputSchema: z.object({
        attachmentId: z.string().describe("Attachment ID, e.g. '656461'"),
      }),
    },
    async ({ attachmentId }) => {
      try {
        const client = getJiraClient();
        const { data: meta } = await client.get<{ filename?: string; mimeType?: string; size?: number }>(
          `/attachment/${attachmentId}`
        );
        if (meta.size && meta.size > MAX_ATTACHMENT_BYTES) {
          throw new Error(
            `Attachment "${meta.filename ?? attachmentId}" is ${meta.size} bytes, exceeding the ${MAX_ATTACHMENT_BYTES} byte limit for tool responses.`
          );
        }
        // Jira answers with a 303 to a signed api.media.atlassian.com URL; axios follows it
        // and drops the Basic Authorization header on the cross-host hop.
        const { data, headers } = await client.get<ArrayBuffer>(`/attachment/content/${attachmentId}`, {
          responseType: "arraybuffer",
          headers: { Accept: "*/*" },
        });
        const buffer = Buffer.from(data);
        const mimeType = meta.mimeType ?? String(headers["content-type"] ?? "application/octet-stream");
        const result = { attachmentId, filename: meta.filename, mimeType, size: buffer.length };
        return toTextResponse(
          isTextMimeType(mimeType)
            ? { ...result, encoding: "utf-8", content: buffer.toString("utf-8") }
            : { ...result, encoding: "base64", content: buffer.toString("base64") }
        );
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("searchJiraIssuesUsingJql"),
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
    p("createJiraIssue"),
    {
      description: "Create a new Jira issue in a project. Returns the created issue key and URL. To create a subtask, set issueType to a subtask issue type and provide parentKey or parentId. Supports customFields keyed by Jira field ID.",
      inputSchema: z.object({
        projectKey: z.string().describe("Project key, e.g. 'PROJ'"),
        summary: z.string().describe("Issue title/summary"),
        issueType: z.string().default("Task").describe("Issue type: 'Task', 'Bug', 'Story', 'Subtask', etc."),
        description: z.string().optional().describe("Issue description (plain text)"),
        assigneeAccountId: z.string().optional().describe("Assignee account ID"),
        parentKey: z.string().optional().describe("Parent issue key, e.g. 'PROJ-123'. Required when creating a subtask unless parentId is provided."),
        parentId: z.string().optional().describe("Parent issue ID. Required when creating a subtask unless parentKey is provided."),
        customFields: jiraCustomFieldsSchema.optional().describe("Custom field values keyed by Jira field ID, e.g. {\"customfield_10015\":\"2026-07-07\"}. Date fields usually use YYYY-MM-DD."),
      }),
    },
    async ({ projectKey, summary, issueType, description, assigneeAccountId, parentKey, parentId, customFields }) => {
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

        const parentField = toJiraParentField(parentKey, parentId);
        if (isSubtaskIssueType(issueType) && !parentField) {
          throw new Error("Creating a Jira subtask requires parentKey or parentId.");
        }
        if (parentField) fields.parent = parentField;
        applyJiraFields(fields, customFields);

        const { data } = await getJiraClient().post<{ id: string; key: string; self: string }>("/issue", { fields });
        return toTextResponse({ id: data.id, key: data.key, url: data.self });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("editJiraIssue"),
    {
      description: "Modify field values of an existing Jira issue. Supports summary, description, assignee, priority, arbitrary Jira fields, and customFields keyed by Jira field ID.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        summary: z.string().optional().describe("New summary"),
        description: z.string().optional().describe("New description (plain text)"),
        assigneeAccountId: z.string().optional().describe("New assignee account ID"),
        priority: z.string().optional().describe("Priority name, e.g. 'High', 'Medium', 'Low'"),
        fields: jiraFieldsSchema.optional().describe("Additional Jira fields keyed by field ID or system field name, e.g. {\"labels\":[\"backend\"]}."),
        customFields: jiraCustomFieldsSchema.optional().describe("Custom field values keyed by Jira field ID, e.g. {\"customfield_10015\":\"2026-07-07\"}. Date fields usually use YYYY-MM-DD."),
      }),
    },
    async ({ issueIdOrKey, summary, description, assigneeAccountId, priority, fields: additionalFields, customFields }) => {
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
        applyJiraFields(fields, additionalFields, customFields);

        if (Object.keys(fields).length === 0) {
          throw new Error("At least one field value must be provided.");
        }

        await getJiraClient().put(`/issue/${issueIdOrKey}`, { fields });
        return toTextResponse({ success: true, issueIdOrKey });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("transitionJiraIssue"),
    {
      description: "Execute a workflow state change on a Jira issue. Supports field values required by transition screens, including customFields keyed by Jira field ID.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        status: z.string().optional().describe("Target status name, e.g. 'In Progress', 'Done'. Required unless transitionId is provided."),
        transitionId: z.string().optional().describe("Exact Jira transition ID. Use this when transition names are ambiguous."),
        fields: jiraFieldsSchema.optional().describe("Field values to submit with the transition, keyed by Jira field ID or system field name."),
        customFields: jiraCustomFieldsSchema.optional().describe("Custom field values to submit with the transition, e.g. {\"customfield_10015\":\"2026-07-07\"}. Date fields usually use YYYY-MM-DD."),
      }),
    },
    async ({ issueIdOrKey, status, transitionId, fields: additionalFields, customFields }) => {
      try {
        const { data } = await getJiraClient().get<{ transitions: JiraTransition[] }>(
          `/issue/${issueIdOrKey}/transitions`
        );
        if (!status && !transitionId) {
          throw new Error("Provide either status or transitionId.");
        }

        const normalizedStatus = status?.trim().toLowerCase();
        const transition = transitionId
          ? data.transitions.find(t => t.id === transitionId)
          : data.transitions.find(t =>
              t.name.toLowerCase() === normalizedStatus
              || t.to.name.toLowerCase() === normalizedStatus
            );

        if (!transition) {
          const available = data.transitions.map(t => `${t.name} -> ${t.to.name}`).join(", ");
          return toTextResponse(
            transitionId
              ? `Transition ID "${transitionId}" not found. Available: ${available}`
              : `Status "${status}" not found. Available: ${available}`
          );
        }

        const body: { transition: { id: string }; fields?: Record<string, unknown> } = {
          transition: { id: transition.id },
        };
        const fields: Record<string, unknown> = {};
        applyJiraFields(fields, additionalFields, customFields);
        if (Object.keys(fields).length > 0) body.fields = fields;

        await getJiraClient().post(`/issue/${issueIdOrKey}/transitions`, body);
        return toTextResponse({
          success: true,
          issueIdOrKey,
          transition: transition.name,
          status: transition.to.name,
          transitionId: transition.id,
        });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("getTransitionsForJiraIssue"),
    {
      description: "List all available workflow transitions for a Jira issue. Use includeFields to see fields required by transition screens.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
        includeFields: z.boolean().default(false).describe("When true, expands transition field metadata including required fields."),
      }),
    },
    async ({ issueIdOrKey, includeFields }) => {
      try {
        const { data } = await getJiraClient().get<{ transitions: JiraTransition[] }>(
          `/issue/${issueIdOrKey}/transitions`,
          includeFields ? { params: { expand: "transitions.fields" } } : undefined
        );
        return toTextResponse(data.transitions);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("addCommentToJiraIssue"),
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
    p("addWorklogToJiraIssue"),
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
    p("getVisibleJiraProjects"),
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
    p("getJiraProjectIssueTypesMetadata"),
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
    p("getJiraIssueTypeMetaWithFields"),
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
    p("getJiraIssueEditMetadata"),
    {
      description: "Get editable field metadata for a Jira issue. Use this to confirm custom field IDs and field shapes before editJiraIssue.",
      inputSchema: z.object({
        issueIdOrKey: z.string().describe("Issue ID or key"),
      }),
    },
    async ({ issueIdOrKey }) => {
      try {
        const { data } = await getJiraClient().get(`/issue/${issueIdOrKey}/editmeta`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("getJiraFields"),
    {
      description: "List Jira fields and optionally filter by name or ID. Use this to map display names such as 'Target start' to customfield IDs.",
      inputSchema: z.object({
        query: z.string().optional().describe("Optional case-insensitive name or ID filter, e.g. 'Target start' or 'customfield_10015'."),
        customOnly: z.boolean().default(false).describe("When true, returns only custom fields."),
      }),
    },
    async ({ query, customOnly }) => {
      try {
        const { data } = await getJiraClient().get<Array<{
          id: string;
          name: string;
          custom?: boolean;
          orderable?: boolean;
          navigable?: boolean;
          searchable?: boolean;
          clauseNames?: string[];
          schema?: unknown;
        }>>("/field");
        const normalizedQuery = query?.trim().toLowerCase();
        const fields = data
          .filter(field => !customOnly || field.custom || field.id.startsWith("customfield_"))
          .filter(field => {
            if (!normalizedQuery) return true;
            return field.id.toLowerCase().includes(normalizedQuery)
              || field.name.toLowerCase().includes(normalizedQuery)
              || field.clauseNames?.some(name => name.toLowerCase().includes(normalizedQuery));
          })
          .map(field => ({
            id: field.id,
            name: field.name,
            custom: Boolean(field.custom),
            orderable: field.orderable,
            navigable: field.navigable,
            searchable: field.searchable,
            clauseNames: field.clauseNames,
            schema: field.schema,
          }));
        return toTextResponse(fields);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("getIssueLinkTypes"),
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
    p("getJiraIssueRemoteIssueLinks"),
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
    p("lookupJiraAccountId"),
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

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/yaml",
  "application/x-sh",
  "image/svg+xml",
]);

function isTextMimeType(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return normalized.startsWith("text/")
    || TEXT_MIME_TYPES.has(normalized)
    || normalized.endsWith("+json")
    || normalized.endsWith("+xml");
}

function isSubtaskIssueType(issueType: string): boolean {
  return ["subtask", "sub-task", "sub task"].includes(issueType.trim().toLowerCase());
}

function toJiraParentField(parentKey?: string, parentId?: string): { key: string } | { id: string } | undefined {
  if (parentKey) return { key: parentKey };
  if (parentId) return { id: parentId };
  return undefined;
}

function applyJiraFields(target: Record<string, unknown>, ...sources: Array<Record<string, unknown> | undefined>): void {
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      target[key] = value;
    }
  }
}
