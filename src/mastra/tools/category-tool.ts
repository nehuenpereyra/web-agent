import z from "zod";
import { createTool } from "@mastra/core/tools";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";
import { prisma } from "@/prisma/client";

export const categoryTool = createTool({
  id: "category-tool",
  description: "Gets the information stored in the rag",
  outputSchema: z.object({
    categories: z.array(
      z.string()
    ),
  }),
  execute: async ({  }) => {
    const categories = await prisma.category.findMany({})

   return { categories: categories.map(cat => cat.name) };
  },
});