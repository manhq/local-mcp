import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFigmaClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { FigmaCommentsResponse } from "../types.js";

export function registerCommentTools(server: McpServer): void {
  server.registerTool(
    "figma_get_comments",
    {
      description: "Get all comments on a Figma file. Returns comment text, author, creation date, and resolved status.",
      inputSchema: z.object({
        fileKey: z.string().describe("The Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get<FigmaCommentsResponse>(`/files/${fileKey}/comments`);
        return toTextResponse(data.comments);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  server.registerTool(
    "figma_post_comment",
    {
      description:
        "Post a comment on a Figma file. Optionally attach it to a specific node by providing nodeId.",
      inputSchema: z.object({
        fileKey: z.string().describe("The Figma file key"),
        message: z.string().describe("The comment text"),
        nodeId: z.string().optional().describe("Optional node ID to attach the comment to a specific element"),
      }),
    },
    async ({ fileKey, message, nodeId }) => {
      try {
        const body: Record<string, unknown> = { message };
        if (nodeId) {
          body["client_meta"] = { node_id: nodeId };
        }

        const { data } = await getFigmaClient().post(`/files/${fileKey}/comments`, body);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
