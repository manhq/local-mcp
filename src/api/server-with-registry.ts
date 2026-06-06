import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registry } from "./registry.js";

/**
 * Creates a McpServer that also registers every tool into the global REST
 * registry. We patch registerTool on the instance (not the prototype) so
 * the rest of the SDK behaviour is unchanged.
 */
export function createMcpServerWithRegistry(
  service: string,
  info: ConstructorParameters<typeof McpServer>[0],
): McpServer {
  const server = new McpServer(info);
  const origRegisterTool = server.registerTool.bind(server);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool = (
    name: string,
    config: {
      title?: string;
      description?: string;
      // inputSchema can be a ZodObject shape or a full ZodType — accept both
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outputSchema?: any;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb: (...args: any[]) => any,
  ) => {
    // Determine the full Zod schema we can use for validation and OpenAPI gen
    const rawSchema = config?.inputSchema;
    let zodSchema: z.ZodTypeAny = z.object({});

    if (rawSchema instanceof z.ZodType) {
      zodSchema = rawSchema;
    } else if (rawSchema && typeof rawSchema === "object" && !Array.isArray(rawSchema)) {
      // Shape object — wrap in z.object
      try {
        zodSchema = z.object(rawSchema as z.ZodRawShape);
      } catch {
        zodSchema = z.object({});
      }
    }

    registry.register({
      name,
      service,
      description: config?.description ?? "",
      inputSchema: zodSchema,
      handler: (input: unknown) => Promise.resolve(cb(input)),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return origRegisterTool(name, config, cb);
  };

  return server;
}
