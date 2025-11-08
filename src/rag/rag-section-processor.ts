import { PgVector } from "@mastra/pg";
import ollama from "ollama";

import { splitTextSmart } from "../utils/split-text-smart";
import { envs } from "@/config/envs";
import { logger } from "@/config/logger";
import { prisma } from "@/prisma/client";
import { generateId } from "@/utils/generate-chunk-id";
import { v4 as uuidv4 } from 'uuid'

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
  private segments: Segment[];
  private segmentIds: Set<string>;

  constructor(maxChunkSize: number = 1000) {
    this.maxChunkSize = maxChunkSize;
    this.chunks = [];
    this.segments = [];
    this.segmentIds = new Set<string>();
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

  public async addSegment(
    content: string,
    datasetName: string,
    nodeSet: string[]
  ) {
    const id = generateId(content)
    // si el segmento ya fue agregado, no lo agregamos de nuevo
    if (this.segmentIds.has(id)) return;
    this.segmentIds.add(id);

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

    this.segments.push({
      id,
      content,
      chunks_id: chunks.length === 1 ? [chunks[0].id] : chunks.flatMap((c) => c.chain),
      node_set: nodeSet,
      dataset_name: datasetName,
      chunks: chunks.map((chunk) => ({
        content: chunk.content,
        metadata: {
          id: chunk.id,
          dataset_name: datasetName,
          node_set: nodeSet
        },
      })),
    });
  }

  public async syncSegment(
    datasetName: string,
  ) {
    const currentBatch = Date.now().toString()

    for (const segment of this.segments) {
      const id = generateId(segment.content)
      await prisma.segment.upsert({
        where: { id },
        update: { updated_at: new Date(), batch: currentBatch },
        create: {
          id: segment.id,
          content: segment.content,
          chunks_id: segment.chunks_id,
          node_set: segment.node_set,
          dataset_name: segment.dataset_name,
          batch: currentBatch
        }
      });
      for (const chunk of segment.chunks) {
        this.chunks.push({
          content: chunk.content,
          metadata: {
            id: chunk.metadata.id,
            dataset_name: chunk.metadata.dataset_name,
            node_set: chunk.metadata.node_set
          },
        });
      }
    }

    // Sincronización en la tabla de vectores
    const oldSegments = await prisma.segment.findMany({
      where: {
        dataset_name: datasetName,
        batch: { not: currentBatch },
      },
      select: { chunks_id: true },
    });

    if (oldSegments.length === 0) {
      console.log('🟢 No hay segmentos antiguos para eliminar.');
      return;
    }

    const toDelete = oldSegments.flatMap(s => s.chunks_id);

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
        batch: { not: currentBatch },
      },
    });
  }
  async getResults({
    query,
    minScore = 0.5,
  }: {
    query: string;
    minScore: number;
  }): Promise<IProcessed[]> {
    const queryEmbedding = await ollama.embeddings({
      model: this.modelName,
      prompt: query,
    });

    const results = await this.store.query({
      indexName: this.indexName,
      queryVector: queryEmbedding.embedding,
      topK: 20,
    });
    console.log('results:', results);
    const resultsFilter = results.filter((value) => value.score >= minScore);


    const ids = resultsFilter.map(result => result.metadata?.id);
    const scoreDict = Object.fromEntries(resultsFilter.map(({ metadata, score }) => [metadata?.id, score]));
    console.log('Retrieved IDs:', ids);
    console.log('Score Dictionary:', scoreDict);
    const segments = await prisma.segment.findMany({
      where: {
        chunks_id: {
          hasSome: ids,
        },
      },
      distinct: ["id"],
    });

    console.log('Matched Segments:', segments.length);

    const segmentResults = segments.map(segment => {
      const maxScore = Math.max(
        ...segment.chunks_id.map(chunkId => scoreDict[chunkId] ?? 0)
      );
      return { text: segment.content, score: maxScore };
    })

    const sortSegmentResults = segmentResults.sort((a, b) => b.score - a.score);

    console.log('Segment Results:', sortSegmentResults.length);

    return sortSegmentResults;
  }
  async generateEmbeddings() {
    const embeddings = [];

    logger.info(`Text Embedding Model: ${this.modelName}`);
    logger.info(`Text Embedding Model Dimention: ${this.dimension}`);
    logger.info(`Total chunks: ${this.chunks.length}`);

    if (this.chunks.length === 0) {
      logger.info(`No chunks to generate embeddings`);
      return;
    }

    for (const chunk of this.chunks) {
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

    await this.store.createIndex({
      indexName: this.indexName,
      dimension: this.dimension,
    });

    await this.store.upsert({
      indexName: this.indexName,
      vectors: embeddings,
      metadata: this.chunks.map((chunk) => chunk.metadata),
    });
  }

}
