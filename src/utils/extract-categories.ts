import { prisma } from "@/prisma/client";
import { callModel } from "./call-model"
import { v4 as uuidv4 } from 'uuid'
import { categoryDiscoveryTool } from "@/mastra/tools/category-discovery-tool";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { mastra } from "@/mastra";
import { envs } from "@/config/envs";

export const generateCategories = async () => {

    console.log('Starting category generation...', envs.NODE_ENV);
    const runtimeContext = new RuntimeContext<any>();

    const datasetName = 'ialp_web';

    const segments = await prisma.segment.findMany({
        where: {
            dataset_name: datasetName,
        },
        include: {
            chunks: true
        }
    });
    for (const segment of segments) {

        const result = await categoryDiscoveryTool.execute({ context: { query: segment.content }, mastra, runtimeContext });


        await prisma.segment.update({
            where: { id: segment.id },
            data: {
                categories: {
                    create: result.new_categories.map(name => ({ id: uuidv4(), name }))
                }
            }
        });

        const chunkIds = segment.chunks.map(c => c.id);
        const newCategories = result.new_categories

        for (const chunkId of chunkIds) {
            const webIndex = await prisma.web_index.findUnique({
                where: { vector_id: chunkId }
            });

            if (!webIndex) continue;

            const metadata = webIndex.metadata || {};
            const categories = (metadata as any).categories || [];

            const updatedCategories = Array.from(new Set([...categories, ...newCategories]));

            await prisma.web_index.update({
                where: { vector_id: chunkId },
                data: {
                    metadata: {
                        ...(typeof metadata === 'object' && metadata !== null ? metadata : {}),
                        categories: updatedCategories
                    }
                }
            });
        }

    }
}

export const clearCategories = async () => {
    const datasetName = 'ialp_web';

    const segments = await prisma.segment.findMany({
        where: {
            dataset_name: datasetName,
        },
        include: {
            chunks: true
        }
    });
    for (const segment of segments) {


        await prisma.category.deleteMany({
            where: { segment_id: segment.id },
        });


        const chunkIds = segment.chunks.map(c => c.id);
        for (const chunkId of chunkIds) {
            const webIndex = await prisma.web_index.findUnique({
                where: { vector_id: chunkId }
            });

            if (!webIndex) continue;
            const metadata = webIndex.metadata || {};

            await prisma.web_index.update({
                where: { vector_id: chunkId },
                data: {
                    metadata: {
                        ...(typeof metadata === 'object' && metadata !== null ? metadata : {}),
                        categories: []
                    }
                }
            });
        }
    }

    // al termianr de borrar las categorias, borrar las categorias de la tabla category
    await prisma.category.deleteMany({});
}
//clearCategories()

generateCategories()