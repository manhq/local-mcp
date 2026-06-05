import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getChatClient } from "../client.js";
import { handleToolError } from "../../../shared/errors.js";
import { toTextResponse } from "../../../shared/response.js";
import type { ListSpacesResponse, ListMessagesResponse, ChatMessage } from "../types.js";

export function registerMessageTools(server: McpServer, prefix?: string): void {
  const p = (name: string) => (prefix ? `${prefix}_${name}` : name);

  server.registerTool(
    p("search_conversations"),
    {
      description:
        "Search Google Chat conversations (spaces, DMs, group DMs) by display name or participants. " +
        "If neither query nor participants are provided, lists all conversations the user is a member of.",
      inputSchema: z.object({
        spaceNameQuery: z.string().optional().describe("Text to search within space display names (case-insensitive)"),
        participants: z.array(z.string()).optional().describe("Email addresses of participants to filter by (excluding the caller)"),
        pageSize: z.number().int().min(1).max(1000).default(100).describe("Max results to return (default 100)"),
        pageToken: z.string().optional().describe("Pagination token from a previous call"),
      }),
    },
    async ({ spaceNameQuery, participants, pageSize, pageToken }) => {
      try {
        const client = await getChatClient();
        const params: Record<string, unknown> = { pageSize };
        if (pageToken) params.pageToken = pageToken;

        const filters: string[] = [];
        if (spaceNameQuery) filters.push(`displayName:"${spaceNameQuery}"`);
        if (participants?.length) {
          filters.push(participants.map(p => `member:"${p}"`).join(" AND "));
        }
        if (filters.length) params.filter = filters.join(" AND ");

        const { data } = await client.get<ListSpacesResponse>("/spaces", { params });
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("list_messages"),
    {
      description:
        "Retrieve messages from a Google Chat conversation (space, DM, or group DM). " +
        "Can be filtered by thread, time range, and supports pagination.",
      inputSchema: z.object({
        conversationId: z.string().describe("Space resource name, e.g. 'spaces/AAAA...'"),
        threadId: z.string().optional().describe("Thread resource name to scope to a specific thread, e.g. 'spaces/AAAA.../threads/BBBB...'"),
        pageSize: z.number().int().min(1).max(50).default(20).describe("Max messages to return (default 20, max 50)"),
        pageToken: z.string().optional().describe("Pagination token from a previous call"),
        startTime: z.string().optional().describe("ISO 8601 timestamp — return messages after this time"),
        endTime: z.string().optional().describe("ISO 8601 timestamp — return messages before this time"),
      }),
    },
    async ({ conversationId, threadId, pageSize, pageToken, startTime, endTime }) => {
      try {
        const client = await getChatClient();
        const params: Record<string, unknown> = { pageSize };
        if (pageToken) params.pageToken = pageToken;

        const filters: string[] = [];
        if (threadId) filters.push(`thread.name = "${threadId}"`);
        if (startTime) filters.push(`createTime > "${startTime}"`);
        if (endTime) filters.push(`createTime < "${endTime}"`);
        if (filters.length) params.filter = filters.join(" AND ");

        const { data } = await client.get<ListMessagesResponse>(
          `/${conversationId}/messages`,
          { params }
        );
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("search_messages"),
    {
      description:
        "Search messages across Google Chat conversations with various filters: keywords, sender, time range, mentions, etc.",
      inputSchema: z.object({
        keywords: z.array(z.string()).optional().describe("Keywords to filter messages by"),
        conversationId: z.string().optional().describe("Scope search to a specific space, e.g. 'spaces/AAAA...'"),
        sender: z.string().optional().describe("Filter by sender email address"),
        startTime: z.string().optional().describe("ISO 8601 timestamp — messages after this time"),
        endTime: z.string().optional().describe("ISO 8601 timestamp — messages before this time"),
        mentionsMe: z.boolean().optional().describe("Only return messages that mention the calling user"),
        isUnread: z.boolean().optional().describe("Only return unread messages"),
        hasLink: z.boolean().optional().describe("Only return messages containing URLs"),
        pageSize: z.number().int().min(1).max(100).default(25).describe("Max results (default 25, max 100)"),
        pageToken: z.string().optional().describe("Pagination token from a previous call"),
        orderBy: z.enum(["CREATE_TIME_DESC", "CREATE_TIME_ASC", "RELEVANCE_DESC"])
          .default("CREATE_TIME_DESC")
          .describe("Sort order (default: CREATE_TIME_DESC)"),
      }),
    },
    async ({ keywords, conversationId, sender, startTime, endTime, mentionsMe, isUnread, hasLink, pageSize, pageToken, orderBy }) => {
      try {
        const client = await getChatClient();

        const searchParams: Record<string, unknown> = {};
        if (keywords?.length) searchParams.keywords = keywords;
        if (conversationId) searchParams.conversationId = conversationId;
        if (sender) searchParams.sender = sender;
        if (startTime) searchParams.startTime = startTime;
        if (endTime) searchParams.endTime = endTime;
        if (mentionsMe !== undefined) searchParams.mentionsMe = mentionsMe;
        if (isUnread !== undefined) searchParams.isUnread = isUnread;
        if (hasLink !== undefined) searchParams.hasLink = hasLink;

        const params: Record<string, unknown> = {
          pageSize,
          orderBy,
          ...(pageToken && { pageToken }),
        };

        const { data } = await client.get<{ messages: ChatMessage[]; nextPageToken?: string }>(
          "/messages:search",
          { params: { ...params, searchParameters: JSON.stringify(searchParams) } }
        );
        return toTextResponse(data);
      } catch (error) { return handleToolError(error); }
    }
  );

  server.registerTool(
    p("send_message"),
    {
      description:
        "Send a message to a Google Chat conversation. Optionally reply to a specific thread.",
      inputSchema: z.object({
        conversationId: z.string().describe("Space resource name, e.g. 'spaces/AAAA...'"),
        messageText: z.string().describe("Message content. Supports basic Markdown formatting."),
        threadId: z.string().optional().describe("Thread resource name to reply to, e.g. 'spaces/AAAA.../threads/BBBB...'"),
      }),
    },
    async ({ conversationId, messageText, threadId }) => {
      try {
        const client = await getChatClient();
        const body: Record<string, unknown> = { text: messageText };
        if (threadId) body.thread = { name: threadId };

        const { data } = await client.post<ChatMessage>(
          `/${conversationId}/messages`,
          body
        );
        return toTextResponse({
          name: data.name,
          text: data.text,
          createTime: data.createTime,
          thread: data.thread,
        });
      } catch (error) { return handleToolError(error); }
    }
  );
}
