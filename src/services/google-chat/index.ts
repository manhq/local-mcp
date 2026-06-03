import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMessageTools } from "./tools/messages.js";

export function registerGChatTools(server: McpServer): void {
  registerMessageTools(server);
}
