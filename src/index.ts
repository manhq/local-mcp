import "dotenv/config";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "./shared/env.js";
import { registerFigmaTools } from "./services/figma/index.js";
import { registerAtlassianTools } from "./services/atlassian/index.js";
import { registerGChatTools } from "./services/google-chat/index.js";

type ServiceName = "figma" | "atlassian" | "google-chat";

interface ServiceDef {
  register: (server: McpServer) => void;
  enabled: boolean;
}

const SERVICE_REGISTRY: Record<ServiceName, ServiceDef> = {
  figma: { register: registerFigmaTools, enabled: !!env.figma },
  atlassian: { register: registerAtlassianTools, enabled: !!env.atlassian },
  "google-chat": { register: registerGChatTools, enabled: !!env.gchat },
};

const activeServices = Object.entries(SERVICE_REGISTRY)
  .filter(([, s]) => s.enabled)
  .map(([name]) => name);

// One transport map per service path
const transportsByService = new Map<ServiceName, Map<string, StreamableHTTPServerTransport>>();
for (const name of activeServices) {
  transportsByService.set(name as ServiceName, new Map());
}

function createServiceServer(name: ServiceName): McpServer {
  const server = new McpServer({ name, version: "1.0.0" });
  SERVICE_REGISTRY[name].register(server);
  return server;
}

function mountMcpHandler(
  app: express.Express,
  path: string,
  getTransports: () => Map<string, StreamableHTTPServerTransport>,
  makeServer: () => McpServer
): void {
  app.all(path, async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      const transports = getTransports();

      if (sessionId && transports.has(sessionId)) {
        await transports.get(sessionId)!.handleRequest(req, res, req.body);
        return;
      }

      if (req.method === "POST" && !sessionId) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports.set(sid, transport);
          },
        });

        transport.onclose = () => {
          if (transport.sessionId) transports.delete(transport.sessionId);
        };

        await makeServer().connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({ error: "Bad request" });
    } catch (err) {
      console.error(`[${path}] Error:`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });
}

const app = express();
app.use(express.json());

// Per-service endpoints: /mcp/figma, /mcp/jira, /mcp/google-chat
for (const name of activeServices) {
  const service = name as ServiceName;
  mountMcpHandler(
    app,
    `/mcp/${service}`,
    () => transportsByService.get(service)!,
    () => createServiceServer(service)
  );
}

// Combined endpoint /mcp — all active services in one server
const combinedTransports = new Map<string, StreamableHTTPServerTransport>();
mountMcpHandler(
  app,
  "/mcp",
  () => combinedTransports,
  () => {
    const server = new McpServer({ name: "local-mcp", version: "1.0.0" });
    for (const name of activeServices) {
      SERVICE_REGISTRY[name as ServiceName].register(server);
    }
    return server;
  }
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    services: activeServices,
    endpoints: {
      combined: `/mcp`,
      ...Object.fromEntries(activeServices.map((s) => [s, `/mcp/${s}`])),
    },
  });
});

app.listen(env.PORT, () => {
  console.log(`Local MCP server running at http://localhost:${env.PORT}`);
  console.log(`Combined endpoint : http://localhost:${env.PORT}/mcp`);
  for (const s of activeServices) {
    console.log(`  /mcp/${s.padEnd(12)}: http://localhost:${env.PORT}/mcp/${s}`);
  }
});
