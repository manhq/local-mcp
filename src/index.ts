import express from "express";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { env } from "./shared/env.js";
import { ServiceName } from "./shared/settings.js";
import { registerFigmaTools } from "./services/figma/index.js";
import { registerAtlassianTools } from "./services/atlassian/index.js";
import { registerGChatTools } from "./services/google-chat/index.js";

interface ServiceDef {
  register: (server: McpServer, prefix?: string) => void;
  combinedPrefix: string;
  enabled: boolean;
}

const SERVICE_REGISTRY: Record<ServiceName, ServiceDef> = {
  figma:        { register: registerFigmaTools,    combinedPrefix: "figma",    enabled: !!env.figma },
  atlassian:    { register: registerAtlassianTools, combinedPrefix: "atlassian", enabled: !!env.atlassian },
  "google-chat": { register: registerGChatTools,   combinedPrefix: "gchat",    enabled: !!env.gchat },
};

const activeServices = Object.entries(SERVICE_REGISTRY)
  .filter(([, s]) => s.enabled)
  .map(([name]) => name);

function createServiceServer(name: ServiceName): McpServer {
  const server = new McpServer({ name, version: "1.0.0" });
  // Per-service path: no prefix, tools keep their base names
  SERVICE_REGISTRY[name].register(server);
  return server;
}

function mountMcpHandler(
  app: express.Express,
  path: string,
  makeServer: () => McpServer
): void {
  // POST: stateless JSON-RPC handler — each request is a self-contained cycle.
  // sessionIdGenerator=undefined tells the SDK not to issue Mcp-Session-Id,
  // which is required for clients like Claude Code that don't persist session headers.
  app.post(path, async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await makeServer().connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(`[${path}] POST error:`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET: spec requires 200+SSE or 405. Stateless servers don't push server-initiated
  // messages, so we return 405 rather than 404 — clients treat 404 as "not found"
  // and may abort entirely, while 405 signals "endpoint exists, feature unsupported".
  app.get(path, (_req, res) => {
    res.status(405).set("Allow", "POST").json({ error: "Method Not Allowed" });
  });

  // DELETE: clients (Cursor, Windsurf, Claude Desktop) send DELETE to close sessions.
  // We have no sessions to delete, so 405 is the correct spec-compliant response.
  app.delete(path, (_req, res) => {
    res.status(405).set("Allow", "POST").json({ error: "Method Not Allowed" });
  });
}

// Legacy SSE transport (MCP spec 2024-11-05) for older clients.
// Clients connecting via old transport do GET /sse → open SSE stream,
// then POST /messages?sessionId=... → send JSON-RPC messages.
function mountLegacySseHandler(
  app: express.Express,
  ssePath: string,
  postPath: string,
  makeServer: () => McpServer
): void {
  const sessions = new Map<string, SSEServerTransport>();

  app.get(ssePath, async (req, res) => {
    try {
      const transport = new SSEServerTransport(`${postPath}`, res);
      sessions.set(transport.sessionId, transport);
      transport.onclose = () => sessions.delete(transport.sessionId);

      await makeServer().connect(transport);
      await transport.start();
    } catch (err) {
      console.error(`[${ssePath}] SSE error:`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post(postPath, async (req, res) => {
    const sessionId = req.query["sessionId"] as string | undefined;
    const transport = sessionId ? sessions.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).json({ error: "Unknown or missing sessionId" });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });
}

function makeCombinedServer(): McpServer {
  const server = new McpServer({ name: "localmcp", version: "1.0.0" });
  for (const name of activeServices) {
    const svc = SERVICE_REGISTRY[name as ServiceName];
    // Combined path: pass prefix so tools are namespaced by service
    svc.register(server, svc.combinedPrefix);
  }
  return server;
}

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  // Streamable HTTP — combined
  mountMcpHandler(app, "/mcp", makeCombinedServer);

  // Streamable HTTP — per-service: /mcp/figma, /mcp/atlassian, /mcp/google-chat
  for (const name of activeServices) {
    const service = name as ServiceName;
    mountMcpHandler(app, `/mcp/${service}`, () => createServiceServer(service));
  }

  // Legacy SSE (2024-11-05) — combined: GET /sse  →  POST /messages?sessionId=...
  mountLegacySseHandler(app, "/sse", "/messages", makeCombinedServer);

  // Legacy SSE — per-service: GET /sse/:service  →  POST /messages/:service?sessionId=...
  for (const name of activeServices) {
    const service = name as ServiceName;
    mountLegacySseHandler(
      app,
      `/sse/${service}`,
      `/messages/${service}`,
      () => createServiceServer(service)
    );
  }

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      services: activeServices,
      endpoints: {
        streamableHttp: {
          combined: "/mcp",
          ...Object.fromEntries(activeServices.map((s) => [s, `/mcp/${s}`])),
        },
        legacySse: {
          combined: "/sse",
          ...Object.fromEntries(activeServices.map((s) => [s, `/sse/${s}`])),
        },
      },
    });
  });

  return app;
}

export function startServer(): void {
  createApp().listen(env.PORT, () => {
    const base = `http://localhost:${env.PORT}`;
    console.log(`Local MCP server running at ${base}`);
    console.log(`  Streamable HTTP : ${base}/mcp`);
    console.log(`  Legacy SSE      : ${base}/sse  (messages: ${base}/messages)`);
    for (const s of activeServices) {
      console.log(`  [${s}]  ${base}/mcp/${s}  |  ${base}/sse/${s}`);
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
