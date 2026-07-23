import { isAxiosError } from "axios";

const STATUS_MESSAGES: Record<number, string> = {
  401: "Invalid credentials",
  403: "Permission denied",
  404: "Not found",
  429: "Rate limited",
};

export function handleToolError(error: unknown): { content: [{ type: "text"; text: string }]; isError: true } {
  let message: string;

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const statusMessage = status ? STATUS_MESSAGES[status] : undefined;
    const apiMessage = extractApiMessage(error.response?.data);

    if (statusMessage) {
      message = apiMessage ? `${statusMessage}: ${apiMessage}` : statusMessage;
    } else {
      message = apiMessage ?? error.message;
    }

    if (status) {
      message = `[HTTP ${status}] ${message}`;
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

// Atlassian/Jira validation errors carry detail in two shapes: `errorMessages`
// (an array of general messages) and `errors` (a field-keyed map, e.g.
// {"customfield_10119": "Cause Analysis is required"} — common on transition
// and edit screens). Both must be surfaced, or field-level 400s collapse into a
// bare "Request failed with status code 400".
function extractApiMessage(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null;
  if (!data || typeof data !== "object") return null;

  const body = data as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof body.message === "string" && body.message.trim()) {
    parts.push(body.message.trim());
  }

  if (Array.isArray(body.errorMessages)) {
    for (const m of body.errorMessages) {
      if (typeof m === "string" && m.trim()) parts.push(m.trim());
    }
  }

  const errors = body.errors;
  if (Array.isArray(errors)) {
    for (const m of errors) {
      if (typeof m === "string" && m.trim()) parts.push(m.trim());
    }
  } else if (errors && typeof errors === "object") {
    for (const [field, m] of Object.entries(errors as Record<string, unknown>)) {
      if (typeof m === "string" && m.trim()) parts.push(`${field}: ${m.trim()}`);
    }
  }

  if (parts.length === 0) return null;
  return [...new Set(parts)].join("; ");
}
