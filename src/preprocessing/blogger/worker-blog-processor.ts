import { slugToTitle } from "@/utils/slug-to-title";
import { BlogTask } from "./parallel-ingest";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";

export default async function processBlog({ blog }: BlogTask): Promise<string> {
    let ragSectionProcessor: RAGSectionProcessor | null = null;
    
    try {
        ragSectionProcessor = new RAGSectionProcessor(250);
        await ragSectionProcessor.initialize();

        console.log(`[Worker] Procesando blog ID: ${blog.id}, título: ${blog.title.rendered}`);

        await ragSectionProcessor.add(
            `<strong>${blog.title.rendered} </strong>` + blog.content.rendered,
            blog.link,
            [slugToTitle(blog.link)],
            'resumenlatinoamericano_posts'
        );

        return `✅ Procesado correctamente: ${blog.title.rendered}`;
    } catch (error) {
        console.error(`❌ Error procesando blog ${blog.id}:`, error);
        throw error;
    } finally {
        if (ragSectionProcessor) {
            await ragSectionProcessor.close();
        }
    }
}