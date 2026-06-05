import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFigmaClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";

export function registerImageTools(server: McpServer): void {
  /**
   * Mirrors: get_screenshot
   * Renders one or more nodes to image URLs (PNG/JPG/SVG/PDF).
   */
  server.registerTool(
    "figma_export_image",
    {
      description:
        "Export a Figma node as an image and get a temporary download URL. " +
        "Supports PNG, JPG, SVG, and PDF formats. Use this to get a visual snapshot of a frame or component.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
        nodeIds: z
          .array(z.string())
          .min(1)
          .describe("One or more node IDs to export (e.g. ['123:456', '789:0'])"),
        format: z
          .enum(["png", "jpg", "svg", "pdf"])
          .default("png")
          .describe("Export format (default: png)"),
        scale: z
          .number()
          .min(0.01)
          .max(4)
          .default(1)
          .describe("Image scale multiplier, 1 = 1x (default: 1)"),
      }),
    },
    async ({ fileKey, nodeIds, format, scale }) => {
      try {
        const { data } = await getFigmaClient().get(`/images/${fileKey}`, {
          params: {
            ids: nodeIds.join(","),
            format,
            scale,
          },
        });

        return toTextResponse({
          images: data.images,
          err: data.err ?? null,
        });
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Get image fills embedded in a file (images used as fill sources).
   */
  server.registerTool(
    "figma_get_image_fills",
    {
      description:
        "Get download URLs for all image fills used inside a Figma file. " +
        "Use this to download assets (logos, photos) that are embedded as fills in the design.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
      }),
    },
    async ({ fileKey }) => {
      try {
        const { data } = await getFigmaClient().get(`/files/${fileKey}/images`);
        return toTextResponse(data);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
