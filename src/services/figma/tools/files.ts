import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import figmaClient from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { FigmaFile } from "../types.js";

export function registerFileTools(server: McpServer): void {
  /**
   * Mirrors: get_metadata
   * Returns a sparse outline of the file or a specific node — IDs, names, types,
   * bounding boxes. Intentionally lightweight; use figma_get_design_context for
   * full property details.
   */
  server.registerTool(
    "figma_get_metadata",
    {
      description:
        "Get a sparse structural outline of a Figma file or a specific node: layer names, IDs, types, and bounding boxes. " +
        "Use this first to understand the file layout before fetching full design details. " +
        "If nodeId is omitted, returns the top-level page list.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key (from the file URL)"),
        nodeId: z.string().optional().describe("Optional node ID to scope the outline to a specific layer"),
        depth: z.number().int().min(1).max(5).default(2).describe("How many levels deep to traverse (default 2)"),
      }),
    },
    async ({ fileKey, nodeId, depth }) => {
      try {
        if (nodeId) {
          const { data } = await figmaClient.get(`/files/${fileKey}/nodes`, {
            params: { ids: nodeId, depth },
          });
          return toTextResponse(summarizeNodes(data.nodes));
        }

        const { data } = await figmaClient.get<FigmaFile>(`/files/${fileKey}`, {
          params: { depth },
        });

        const outline = {
          name: data.name,
          pages: data.document.children.map((page) => ({
            id: page.id,
            name: page.name,
            type: page.type,
            childCount: page.children?.length ?? 0,
            children: page.children?.slice(0, 20).map((n) => ({
              id: n.id,
              name: n.name,
              type: n.type,
            })),
          })),
        };

        return toTextResponse(outline);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  /**
   * Mirrors: get_design_context
   * Returns full design properties for a specific node: fills, strokes, typography,
   * layout, effects, constraints — enough for a developer to implement the design.
   */
  server.registerTool(
    "figma_get_design_context",
    {
      description:
        "Get full design context for a specific Figma node: fills, strokes, typography, auto-layout, effects, and constraints. " +
        "Use this when you need implementation details for a component or frame. Requires a nodeId — use figma_get_metadata first to find IDs.",
      inputSchema: z.object({
        fileKey: z.string().describe("Figma file key"),
        nodeId: z.string().describe("Node ID to inspect (e.g. '123:456')"),
      }),
    },
    async ({ fileKey, nodeId }) => {
      try {
        const { data } = await figmaClient.get(`/files/${fileKey}/nodes`, {
          params: { ids: nodeId },
        });

        const node = data.nodes[nodeId];
        if (!node) {
          return toTextResponse(`Node ${nodeId} not found in file ${fileKey}`);
        }

        return toTextResponse(node);
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}

function summarizeNodes(nodes: Record<string, unknown>): unknown {
  return Object.entries(nodes).map(([id, node]) => ({
    id,
    ...(node as Record<string, unknown>),
  }));
}
