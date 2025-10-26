import z from "zod";
import { createTool } from "@mastra/core/tools";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";

export const webTool = createTool({
  id: "web-tool",
  description: "Gets the information stored in the rag",
  inputSchema: z.object({
    query: z.string().describe("Query to search for"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        text: z.string(),
        url: z.string(),
        score: z.number(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { query } = context;
    const ragSectionProcessor = new RAGSectionProcessor()

    return {results: await ragSectionProcessor.getResults({query, minScore: 0.5})}
  },
});
