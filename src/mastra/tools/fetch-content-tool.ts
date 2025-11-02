import z from "zod";
import { createTool } from "@mastra/core/tools";
import { splitByArticles } from "@/scraping/formatters/html-formatter";

const urlSchema = z.url("Debe ser una URL válida");

export const fetchContentTool = createTool({
  id: "fetch-content-tool",
  description: "Recibe múltiples URLs, valida y devuelve el contenido de las válidas",
  inputSchema: z.object({
    urls: z.array(z.string()).describe("Lista de URLs a procesar"),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        url: z.string(),
        content: z.string().describe("Contenido obtenido"),
      })
    ),
    invalidUrls: z.array(z.string()).describe("Listado de URLs no válidas"),
    failedUrls: z.array(z.string()).describe("Listado de URLs válidas que fallaron al obtener el contenido"),
  }),

  execute: async ({ context }) => {
    const { urls } = context;

    const validUrls: string[] = [];
    const invalidUrls: string[] = [];
    const failedUrls: string[] = [];
    const results: { url: string; content: string }[] = [];

    for (const u of urls) {
      const parsed = urlSchema.safeParse(u);
      if (parsed.success) validUrls.push(u);
      else invalidUrls.push(u);
    }

    for (const url of validUrls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          failedUrls.push(url);
          continue;
        }
        const html = await response.text();
        const content = splitByArticles(html);
        results.push({ url, content: content.join("") });
      } catch {
        failedUrls.push(url);
      }
    }

    return { results, invalidUrls, failedUrls };
  },
});
