import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "./tools/files.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerVariableTools } from "./tools/variables.js";
import { registerImageTools } from "./tools/images.js";
import { registerComponentTools } from "./tools/components.js";

export function registerFigmaTools(server: McpServer, prefix?: string): void {
  registerFileTools(server, prefix);
  registerCommentTools(server, prefix);
  registerVariableTools(server, prefix);
  registerImageTools(server, prefix);
  registerComponentTools(server, prefix);
}
