import z from "zod";
import { createTool } from "@mastra/core/tools";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";
import { prisma } from "@/prisma/client";
import { categoryDiscoveryTool } from "./category-discovery-tool";

export const webCategoryTool = createTool({
  id: "web-category-tool",
  description: "Gets the information stored in the rag",
  inputSchema: z.object({
    query: z.string().describe("Query to search for"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        text: z.string(),
        score: z.number(),
      })
    ),
  }),
  execute: async ({ context, mastra, runtimeContext }) => {
    const { query } = context;

    const ragSectionProcessor = new RAGSectionProcessor()

    const result = await categoryDiscoveryTool.execute({ context: { query }, mastra, runtimeContext });

    console.log(result);

    return { results: await ragSectionProcessor.getResults({ query, minScore: 0.5, categories: result!.matches }) }
  },
});