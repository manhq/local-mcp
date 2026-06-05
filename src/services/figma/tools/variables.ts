import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFigmaClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";

export function registerVariableTools(server: McpServer): void {
  /**
   * Mirrors: get_variable_defs
   * Extracts design tokens (colors, spacing, typography, etc.) from a Figma file.
   */
  server.registerTool(
    "figma_get_variables",
    {
      description:
        "Get all local design variables (tokens) from a Figma file: colors, spacing, typography, radii, etc. " +
        "Use this to extract a file's design system tokens for implementation or documentation.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/variables/local`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Get published variables from a library file.
   */
  server.registerTool(
    "figma_get_published_variables",
    {
      description:
        "Get published design variables from a Figma library file. " +
        "Use this to see which tokens are exported for use in other files.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma library file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/variables/published`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
