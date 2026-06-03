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
    const apiMessage =
      error.response?.data?.message ??
      error.response?.data?.errorMessages?.[0] ??
      error.response?.data?.errors?.[0] ??
      null;

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
