import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMessageTools } from "./tools/messages.js";

export function registerGChatTools(server: McpServer, prefix?: string): void {
  registerMessageTools(server, prefix);
}
