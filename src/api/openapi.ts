import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolDef } from "./registry.js";

interface OpenApiSpec {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, unknown>;
}

export function buildOpenApiSpec(tools: ToolDef[], port: number): OpenApiSpec {
  const serviceSet = new Set(tools.map((t) => t.service));
  const tags = [...serviceSet].map((s) => ({
    name: s,
    description: `${capitalize(s)} tools`,
  }));

  const paths: Record<string, unknown> = {};

  for (const tool of tools) {
    const path = `/api/${tool.service}/${tool.name}`;
    const jsonSchema = zodToJsonSchema(tool.inputSchema, { target: "openApi3" });
    const requestBody =
      isEmptySchema(jsonSchema)
        ? undefined
        : {
            required: true,
            content: {
              "application/json": {
                schema: jsonSchema,
              },
            },
          };

    paths[path] = {
      post: {
        operationId: tool.name,
        summary: tool.name,
        description: tool.description,
        tags: [tool.service],
        ...(requestBody ? { requestBody } : {}),
        responses: {
          "200": {
            description: "Tool result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    result: { description: "Tool output (JSON or text)" },
                    isError: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Invalid input" },
          "404": { description: "Tool not found" },
          "500": { description: "Tool execution error" },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "LocalMCP REST API",
      version: "1.0.0",
      description:
        "REST interface for LocalMCP tools. Each POST endpoint mirrors an MCP tool — " +
        "send JSON body matching the tool's input schema and receive the result.",
    },
    servers: [{ url: `http://localhost:${port}`, description: "Local server" }],
    tags,
    paths,
  };
}

function isEmptySchema(schema: unknown): boolean {
  if (typeof schema !== "object" || schema === null) return true;
  const s = schema as Record<string, unknown>;
  return (
    s["type"] === "object" &&
    (!s["properties"] || Object.keys(s["properties"] as object).length === 0)
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
