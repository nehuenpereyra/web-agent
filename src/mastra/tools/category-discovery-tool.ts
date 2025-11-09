import z from "zod";
import { createTool } from "@mastra/core/tools";
import { prisma } from "@/prisma/client";

const outputSchema = z.object({
    matches: z.array(z.string()),
    new_categories: z.array(z.string())
});


export const categoryDiscoveryTool = createTool({
    id: "category-discovery-tool",
    description: "Analyzes a text to identify matching existing categories and suggest new categories based on named entities.",
    inputSchema: z.object({
        query: z.string().describe("Query to search for"),
    }),
    outputSchema,
    execute: async ({ context, mastra }) => {
        const { query } = context;

        const agent = mastra!.getAgent("categoryDiscoveryAgent");
        const categories = await prisma.category.findMany({
            select: { name: true },
        });
        const categoryList = categories.map(c => c.name).join(", ") || "[]";

        const response = await agent.generate(`
      Categorías existentes:
      ${categoryList}

      Texto a categorizar:
      ${query}
      `, {
            structuredOutput: {
                schema: outputSchema,
                jsonPromptInjection: true,
                instructions: "Devuelve solo JSON válido que cumpla con el esquema dado.",
                errorStrategy: "strict",
            }
        });

        return response!.object
    },
});