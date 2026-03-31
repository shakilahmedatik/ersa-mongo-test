import { Agent } from "@mastra/core/agent";
import { getEnv } from "../../../config/env";
import { getChatMemory } from "./chat.memory";
import { queryDocsTool } from "./chat.tools";

export const chatAssistantAgentName = "chatAssistant";
export const chatAssistantAgentId = "chat-assistant";
const env = getEnv();

export const chatAssistantAgent = new Agent({
  id: chatAssistantAgentId,
  name: "Ersa Chat Assistant",
  description:
    "A concise product and support assistant for logged-in Ersa Chat users.",
  instructions: `
You are the Ersa Chat assistant inside a web application.

Rules:
- Answer clearly, concisely, and directly.
- Use the query-docs tool when the request might depend on product, support, or internal knowledge-base information.
- For greetings, follow-up questions, or general conversation, reply directly without searching.
- The query-docs tool returns relevant, source, and context fields.
- Use the context only when relevant is true.
- If relevant is false, continue normally using general reasoning.
- Do not mention whether internal documentation was or was not found.
- If you are unsure, say so plainly instead of inventing facts.
- Ask one focused follow-up question when the request is ambiguous.
`.trim(),
  model: env.assistantModel,
  defaultOptions: {
    maxSteps: 5,
  },
  tools: {
    queryDocs: queryDocsTool,
  },
  memory: getChatMemory(),
});
