import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "./tools/files.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerVariableTools } from "./tools/variables.js";
import { registerImageTools } from "./tools/images.js";
import { registerComponentTools } from "./tools/components.js";

export function registerFigmaTools(server: McpServer): void {
  registerFileTools(server);
  registerCommentTools(server);
  registerVariableTools(server);
  registerImageTools(server);
  registerComponentTools(server);
}
