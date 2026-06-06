import type express from "express";
import { registry } from "./registry.js";
import { buildOpenApiSpec } from "./openapi.js";
import { playgroundHtml } from "./playground.js";
import { env } from "../shared/env.js";

function extractResult(mcpResult: unknown): { result: unknown; isError: boolean } {
  if (typeof mcpResult !== "object" || mcpResult === null) {
    return { result: mcpResult, isError: false };
  }

  const r = mcpResult as Record<string, unknown>;
  const isError = !!r["isError"];

  if (!Array.isArray(r["content"])) {
    return { result: mcpResult, isError };
  }

  // Collect all content parts, preserving non-text types as-is
  const parts = r["content"] as Array<{ type: string; text?: string }>;
  const results = parts.map((p) => {
    if (p.type === "text" && p.text !== undefined) {
      try { return JSON.parse(p.text); } catch { return p.text; }
    }
    return p; // image, resource, or other content types passed through
  });

  return { result: results.length === 1 ? results[0] : results, isError };
}

export function mountRestApi(app: express.Express): void {
  // Build spec once after all tools are registered; lazy on first request.
  let cachedSpec: unknown = null;

  // GET /api/openapi.json — must be before /api/:service wildcard
  app.get("/api/openapi.json", (_req, res) => {
    cachedSpec ??= buildOpenApiSpec(registry.list(), env.PORT);
    res.json(cachedSpec);
  });

  // GET /playground — Scalar UI
  app.get("/playground", (_req, res) => {
    res.setHeader("Content-Type", "text/html").send(playgroundHtml(env.PORT));
  });

  // GET /api — list all services and their tool counts
  app.get("/api", (_req, res) => {
    const tools = registry.list();
    const serviceSet = new Set(tools.map((t) => t.service));
    res.json(
      [...serviceSet].map((service) => ({
        service,
        toolCount: tools.filter((t) => t.service === service).length,
        endpoint: `/api/${service}`,
      }))
    );
  });

  // GET /api/:service — list tools for a service
  app.get("/api/:service", (req, res) => {
    const tools = registry.byService(req.params["service"]!);
    if (tools.length === 0) {
      res.status(404).json({ error: `Service '${req.params["service"]}' not found` });
      return;
    }
    res.json(tools.map((t) => ({ name: t.name, description: t.description })));
  });

  // POST /api/:service/:tool — call a tool
  app.post("/api/:service/:tool", async (req, res) => {
    const service = req.params["service"]!;
    const toolName = req.params["tool"]!;
    const tool = registry.get(service, toolName);
    if (!tool) {
      res.status(404).json({ error: `Tool '${service}/${toolName}' not found` });
      return;
    }

    const parsed = tool.inputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    try {
      const raw = await tool.handler(parsed.data);
      res.json(extractResult(raw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message, isError: true });
    }
  });
}
