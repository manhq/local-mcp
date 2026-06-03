import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfluenceClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { ConfluencePage, ConfluenceSpace, ConfluenceComment } from "../types.js";

export function registerConfluenceTools(server: McpServer): void {
  server.registerTool(
    "getConfluencePage",
    {
      description: "Fetch a Confluence page or live document by ID. Returns title, space, version, and body content.",
      inputSchema: z.object({
        pageId: z.string().describe("Confluence page ID"),
        includeBody: z.boolean().default(false).describe("Include page body content (default false)"),
      }),
    },
    async ({ pageId, includeBody }) => {
      try {
        const params = includeBody ? { "body-format": "storage" } : {};
        const { data } = await getConfluenceClient().get<ConfluencePage>(`/api/v2/pages/${pageId}`, { params });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getConfluencePageDescendants",
    {
      description: "List child pages under a Confluence parent page.",
      inputSchema: z.object({
        pageId: z.string().describe("Parent page ID"),
        limit: z.number().int().min(1).max(100).default(25).describe("Max results (default 25)"),
      }),
    },
    async ({ pageId, limit }) => {
      try {
        const { data } = await getConfluenceClient().get(`/api/v2/pages/${pageId}/children`, {
          params: { limit },
        });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getConfluencePageFooterComments",
    {
      description: "Retrieve footer-level comments on a Confluence page.",
      inputSchema: z.object({
        pageId: z.string().describe("Page ID"),
      }),
    },
    async ({ pageId }) => {
      try {
        const { data } = await getConfluenceClient().get<{ results: ConfluenceComment[] }>(
          `/api/v2/pages/${pageId}/footer-comments`
        );
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getConfluencePageInlineComments",
    {
      description: "Get inline comments tied to specific text in a Confluence page.",
      inputSchema: z.object({
        pageId: z.string().describe("Page ID"),
      }),
    },
    async ({ pageId }) => {
      try {
        const { data } = await getConfluenceClient().get<{ results: ConfluenceComment[] }>(
          `/api/v2/pages/${pageId}/inline-comments`
        );
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getConfluenceCommentChildren",
    {
      description: "View reply threads to a Confluence comment.",
      inputSchema: z.object({
        commentId: z.string().describe("Comment ID"),
      }),
    },
    async ({ commentId }) => {
      try {
        const { data } = await getConfluenceClient().get(`/api/v2/comments/${commentId}/children`);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getConfluenceSpaces",
    {
      description: "List all Confluence spaces the current user has access to.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(25).describe("Max results (default 25)"),
      }),
    },
    async ({ limit }) => {
      try {
        const { data } = await getConfluenceClient().get<{ results: ConfluenceSpace[] }>("/api/v2/spaces", {
          params: { limit },
        });
        return toTextResponse(data.results);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "getPagesInConfluenceSpace",
    {
      description: "Enumerate pages within a Confluence space.",
      inputSchema: z.object({
        spaceId: z.string().describe("Space ID"),
        limit: z.number().int().min(1).max(100).default(25).describe("Max results (default 25)"),
      }),
    },
    async ({ spaceId, limit }) => {
      try {
        const { data } = await getConfluenceClient().get<{ results: ConfluencePage[] }>(
          `/api/v2/spaces/${spaceId}/pages`, { params: { limit } }
        );
        return toTextResponse(data.results);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "createConfluencePage",
    {
      description: "Create a new Confluence page in a space.",
      inputSchema: z.object({
        spaceId: z.string().describe("Space ID to create the page in"),
        title: z.string().describe("Page title"),
        content: z.string().describe("Page body in plain text or HTML"),
        parentId: z.string().optional().describe("Parent page ID (optional)"),
      }),
    },
    async ({ spaceId, title, content, parentId }) => {
      try {
        const body: Record<string, unknown> = {
          spaceId,
          title,
          body: { representation: "storage", value: content },
        };
        if (parentId) body.parentId = parentId;

        const { data } = await getConfluenceClient().post<ConfluencePage>("/api/v2/pages", body);
        return toTextResponse({ id: data.id, title: data.title, status: data.status });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "updateConfluencePage",
    {
      description: "Edit the content or title of an existing Confluence page. Requires the current version number.",
      inputSchema: z.object({
        pageId: z.string().describe("Page ID"),
        title: z.string().describe("Page title (required even if unchanged)"),
        content: z.string().describe("New page body in plain text or HTML"),
        version: z.number().int().describe("Current version number of the page"),
      }),
    },
    async ({ pageId, title, content, version }) => {
      try {
        const { data } = await getConfluenceClient().put<ConfluencePage>(`/api/v2/pages/${pageId}`, {
          id: pageId,
          title,
          version: { number: version + 1 },
          body: { representation: "storage", value: content },
        });
        return toTextResponse({ id: data.id, title: data.title, version: data.version });
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "createConfluenceFooterComment",
    {
      description: "Add a footer comment to a Confluence page, or reply to an existing footer comment.",
      inputSchema: z.object({
        pageId: z.string().describe("Page ID"),
        comment: z.string().describe("Comment text"),
        parentCommentId: z.string().optional().describe("Parent comment ID to reply to"),
      }),
    },
    async ({ pageId, comment, parentCommentId }) => {
      try {
        const body: Record<string, unknown> = {
          pageId,
          body: { representation: "storage", value: comment },
        };
        if (parentCommentId) body.parentCommentId = parentCommentId;

        const { data } = await getConfluenceClient().post("/api/v2/footer-comments", body);
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "createConfluenceInlineComment",
    {
      description: "Create a text-anchored inline comment on a Confluence page.",
      inputSchema: z.object({
        pageId: z.string().describe("Page ID"),
        comment: z.string().describe("Comment text"),
        inlineCommentProperties: z.object({
          textSelection: z.string().describe("The text to anchor the comment to"),
          textSelectionMatchCount: z.number().int().default(1).describe("Which occurrence to anchor to (default 1)"),
          textSelectionMatchIndex: z.number().int().default(0).describe("Zero-based index of the match (default 0)"),
        }).describe("Properties to anchor the comment to specific text"),
      }),
    },
    async ({ pageId, comment, inlineCommentProperties }) => {
      try {
        const { data } = await getConfluenceClient().post("/api/v2/inline-comments", {
          pageId,
          body: { representation: "storage", value: comment },
          inlineCommentProperties,
        });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    "searchConfluenceUsingCql",
    {
      description: "Search Confluence content using CQL (Confluence Query Language). Example: 'space = \"DEV\" AND title ~ \"API\"'.",
      inputSchema: z.object({
        cql: z.string().describe("CQL query string"),
        limit: z.number().int().min(1).max(100).default(20).describe("Max results (default 20)"),
      }),
    },
    async ({ cql, limit }) => {
      try {
        const { data } = await getConfluenceClient().get("/rest/api/search", {
          params: { cql, limit },
        });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );
}
