import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerJiraTools } from "./tools/jira.js";
import { registerConfluenceTools } from "./tools/confluence.js";

export function registerAtlassianTools(server: McpServer): void {
  registerJiraTools(server);
  registerConfluenceTools(server);
}
