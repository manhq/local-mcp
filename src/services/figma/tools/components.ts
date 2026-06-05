import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFigmaClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";

export function registerComponentTools(server: McpServer): void {
  /**
   * Mirrors: get_libraries (file-level components)
   * Lists all published components in a file.
   */
  server.registerTool(
    "figma_get_components",
    {
      description:
        "Get all published components in a Figma file. Returns component names, descriptions, and node IDs. " +
        "Use this to discover available components in a design library.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/components`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Get component sets (variants) in a file.
   */
  server.registerTool(
    "figma_get_component_sets",
    {
      description:
        "Get all component sets (variant groups) in a Figma file. " +
        "Use this to see which components have variants and their groupings.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/component_sets`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Get styles (colors, text, effects, grids) defined in a file.
   */
  server.registerTool(
    "figma_get_styles",
    {
      description:
        "Get all published styles in a Figma file: color styles, text styles, effect styles, and grid styles. " +
        "Use this to extract the design system's style definitions.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/styles`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Mirrors: search_design_system (team-level)
   * Lists all components published across a team's libraries.
   */
  server.registerTool(
    "figma_get_team_components",
    {
      description:
        "Get all published components across a Figma team's shared libraries. " +
        "Use this to search for reusable components available to the whole team. Requires a teamId.",
      inputSchema: z.object({
        teamId: z.string().describe("Figma team ID (found in the team URL)"),
        pageSize: z.number().int().min(1).max(100).default(50).describe("Number of results per page (default 50)"),
        cursor: z.string().optional().describe("Pagination cursor from a previous response"),
      }),
    },
    async ({ teamId, pageSize, cursor }) => {
      try {
        const { data } = await getFigmaClient().get(`/teams/${teamId}/components`, {
          params: { page_size: pageSize, ...(cursor && { cursor }) },
        });
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Mirrors: whoami
   */
  server.registerTool(
    "figma_whoami",
    {
      description:
        "Get the identity of the authenticated Figma user: name, email, and account ID. " +
        "Use this to verify credentials or identify who the token belongs to.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { data } = await getFigmaClient().get("/me");
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
