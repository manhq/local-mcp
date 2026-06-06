import { z } from "zod";

export interface ToolDef {
  name: string;
  service: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  handler: (input: unknown) => Promise<unknown>;
}

class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  private key(service: string, name: string): string {
    return `${service}:${name}`;
  }

  register(def: ToolDef): void {
    this.tools.set(this.key(def.service, def.name), def);
  }

  get(service: string, name: string): ToolDef | undefined {
    return this.tools.get(this.key(service, name));
  }

  list(): ToolDef[] {
    return [...this.tools.values()];
  }

  byService(service: string): ToolDef[] {
    return this.list().filter((t) => t.service === service);
  }
}

export const registry = new ToolRegistry();
