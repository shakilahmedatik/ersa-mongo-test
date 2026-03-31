import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { knowledgeService } from "../../../features/knowledge/knowledge.service";

const relevanceThreshold = 0.7;

export const queryDocsTool = createTool({
  id: "query-docs",
  description:
    "Search the internal knowledge base for product or support information relevant to the user's question.",
  inputSchema: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .describe("The user question or search query to look up."),
  }),
  outputSchema: z.object({
    relevant: z.boolean(),
    source: z.enum(["internal-docs", "none", "unavailable"]),
    context: z.string(),
  }),
  execute: async ({ query }) => {
    try {
      const results = await knowledgeService.searchPublished(query, 4);

      if (results.length === 0) {
        return {
          relevant: false,
          source: "none" as const,
          context: "",
        };
      }

      const context = results
        .map((result) => {
          return [
            `Title: ${result.title}`,
            result.tags.length > 0 ? `Tags: ${result.tags.join(", ")}` : null,
            `Updated: ${result.updatedAt.toISOString()}`,
            result.content,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n---\n\n");

      return {
        relevant:
          results.length > 0 && context.length > 0 && relevanceThreshold > 0,
        source: "internal-docs" as const,
        context,
      };
    } catch {
      return {
        relevant: false,
        source: "unavailable" as const,
        context: "",
      };
    }
  },
});
