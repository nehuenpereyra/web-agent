import { PgVector } from "@mastra/pg";
import ollama from "ollama";

import { splitTextSmart } from "../utils/split-text-smart";
import { envs } from "@/config/envs";
import { logger } from "@/config/logger";
import { prisma } from "@/prisma/client";
import { generateId } from "@/utils/generate-chunk-id";
import { v4 as uuidv4 } from 'uuid'
import { batch } from "@/prisma/generated";

export interface Chunk {
  content: string;
  metadata: Record<string, any>;
}
export interface IProcessed {
  text: string;
  score: number;
}

interface Segment {
  id: string;
  content: string;
  chunks_id: string[];
  node_set: string[];
  dataset_name: string;
  chunks: { content: string, metadata: { id: string, dataset_name: string, node_set: string[] } }[];
}

export class RAGSectionProcessor {
  private maxChunkSize: number;
  private chunks: Chunk[];
  private store: PgVector;
  private indexName: string;
  private modelName: string;
  private dimension: number;
  public segments: Segment[];
  private currentBatch: batch = { id: uuidv4(), status: 'processing', created_at: new Date() };

  constructor(maxChunkSize: number = 1000) {
    this.maxChunkSize = maxChunkSize;
    this.chunks = [];
    this.segments = [];
    this.store = new PgVector({
      connectionString: envs.POSTGRES_CONNECTION_STRING,
    });
    this.indexName = "web_index";
    this.modelName = envs.TEXT_EMBEDDING_MODEL_NAME;
    this.dimension = envs.TEXT_EMBEDDING_MODEL_DIM;
  }

  public getChunks(): Chunk[] {
    return this.chunks;
  }

  public async initialize() {
    let batch = await prisma.batch.findFirst({
      orderBy: { created_at: 'desc' }
    });

    if (!batch || batch.status === 'completed') {
      batch = await prisma.batch.create({
        data: {
          id: uuidv4(),
          status: 'processing'
        }
      });
    }
    this.currentBatch = batch;

    await this.store.createIndex({
      indexName: this.indexName,
      dimension: this.dimension,
    });
  }

  public async addSegment(
    content: string,
    datasetName: string,
    nodeSet: string[]
  ) {
    const id = generateId(content)
    const existingSegment = await prisma.segment.findUnique({
      where: { id },
    });
    if (existingSegment) {
      await prisma.segment.update({
        where: { id },
        data: {
          updated_at: new Date(),
          batch: this.currentBatch.id
        }
      });
    } else {

      const chunks: { id: string, chain: string[], content: string }[] = []

      if (content.length > this.maxChunkSize) {
        const splitText = splitTextSmart(content, this.maxChunkSize);
        const ids = splitText.map(() => uuidv4());
        splitText.forEach((text, index) => {
          chunks.push({
            id: ids[index],
            chain: ids,
            content: text,
          });
        });
      } else {
        chunks.push({
          id: uuidv4(),
          chain: [],
          content,
        });
      }

      await prisma.segment.create({
        //   where: { id },
        //   update: { updated_at: new Date(), batch: this.currentBatch.id },
        data: {
          id,
          content: content,
          chunks: {
            create: chunks.map((chunk) => ({
              id: chunk.id,
              content: chunk.content
            })),
          },
          node_set: nodeSet,
          dataset_name: datasetName,
          batch: this.currentBatch.id
        }
      });

      const embeddings = [];
      for (const chunk of chunks) {
        try {
          const response = await ollama.embeddings({
            model: this.modelName,
            prompt: chunk.content,
          });
          embeddings.push(response.embedding);
        } catch (error) {
          console.error(`Error generating embedding for chunk: ${error}`);
          throw error;
        }
      }

      const metadata = chunks.map((chunk) => {
        return {
          id: chunk.id,
          dataset_name: datasetName,
          node_set: nodeSet
        }
      })

      await this.store.upsert({
        indexName: this.indexName,
        vectors: embeddings,
        metadata,
        ids: chunks.map((chunk) => chunk.id),
      });

    }
  }

  public async clearSegments(
    datasetName: string,
  ) {

    const oldSegments = await prisma.segment.findMany({
      where: {
        dataset_name: datasetName,
        batch: { not: this.currentBatch.id },
      },
      include: {
        chunks: true
      }
    });

    if (oldSegments.length === 0) {
      console.log('🟢 No hay segmentos antiguos para eliminar.');
      await prisma.batch.update({
        where: { id: this.currentBatch.id },
        data: {
          status: 'completed'
        }
      });
      return;
    }

    const toDelete = oldSegments.flatMap(s => s.chunks.map(c => c.id));

    console.log(`🟠 Se eliminarán ${toDelete.length} chunks de ${oldSegments.length} segmentos antiguos.`);

    for (const id of toDelete) {
      await prisma.web_index.deleteMany({
        where: {
          metadata: {
            path: ["id"],
            equals: id,
          },
        },
      });
    }

    console.log(`🟠 Se eliminarán ${oldSegments.length} segmentos antiguos.`);

    await prisma.segment.deleteMany({
      where: {
        dataset_name: datasetName,
        batch: { not: this.currentBatch.id },
      },
    });

    await prisma.batch.update({
      where: { id: this.currentBatch.id },
      data: {
        status: 'completed'
      }
    });
    logger.info(`Segmentos antiguos eliminados correctamente.`);
  }
  async getResults({
    query,
    minScore = 0.5,
    categories
  }: {
    query: string;
    minScore: number;
    categories?: string[];
  }): Promise<IProcessed[]> {
    const queryEmbedding = await ollama.embeddings({
      model: this.modelName,
      prompt: query,
    });

    const results = await this.store.query({
      indexName: this.indexName,
      queryVector: queryEmbedding.embedding,
      topK: 20,
      ...(categories && categories.length > 0 ? { filter: { categories: { $in: categories } } } : {})
    });

    const resultsFilter = results.filter((value) => value.score >= minScore);
    const ids = resultsFilter.map(result => result.metadata?.id);
    const scoreDict = Object.fromEntries(resultsFilter.map(({ metadata, score }) => [metadata?.id, score]));

    const segments = await prisma.segment.findMany({
      where: {
        OR: [
          {
            chunks: {
              some: {
                id: { in: ids }
              }
            }
          },
          ...(categories && categories.length > 0
            ? [{
              categories: {
                some: {
                  name: { in: categories },
                },
              },
            }]
            : []),
        ],
      },
      include: {
        chunks: true,
      },
      distinct: ['id'],
    });

    const segmentResults = segments.map(segment => {
      const maxScore = Math.max(
        ...segment.chunks.map(chunk => scoreDict[chunk.id] ?? 0)
      );
      return { text: segment.content, score: maxScore };
    })

    const sortSegmentResults = segmentResults.sort((a, b) => b.score - a.score);

    return sortSegmentResults;
  }
  async info() {
    logger.info(`Text embedding model: ${this.modelName}`);
    logger.info(`Text embedding model dimension: ${this.dimension}`);
    logger.info(`Total segments: ${await prisma.segment.count()}`);
    logger.info(`Total chunks: ${await prisma.chunk.count()}`);
    logger.info(`Using batch ID: ${this.currentBatch.id}`);
  }

}
