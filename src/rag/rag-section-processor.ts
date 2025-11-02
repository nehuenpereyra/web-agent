import { PgVector } from "@mastra/pg";
import ollama from "ollama";

import { splitTextSmart } from "../utils/split-text-smart";
import { envs } from "@/config/envs";
import { logger } from "@/config/logger";
import { prisma } from "@/prisma/client";
import { Prisma } from "@/prisma/generated";
import { generateChunkId } from "@/utils/generate-chunk-id";

export interface Chunk {
  content: string;
  metadata: Record<string, any>;
}
export interface IProcessed {
  text: string;
  score: number;
  url: string;
}

export class RAGSectionProcessor {
  private maxChunkSize: number;
  private chunks: Chunk[];
  private store: PgVector;
  private indexName: string;
  private modelName: string;
  private dimension: number;

  constructor(maxChunkSize: number = 1000) {
    this.maxChunkSize = maxChunkSize;
    this.chunks = [];
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

  public addText(
    text: string,
    customMetadata: Record<string, any>,
    documentId: string,
    unique: string
  ) {
    if (text.length > this.maxChunkSize) {
      const splitText = splitTextSmart(text, this.maxChunkSize);
      const ids = splitText.map((value) => generateChunkId(value + unique));
      splitText.forEach((text, index) => {
        this.chunks.push({
          content: text,
          metadata: {
            ...customMetadata,
            id: ids[index],
            chain: ids,
            text,
            documentId,
          },
        });
      });
    } else {
      this.chunks.push({
        content: text,
        metadata: {
          ...customMetadata,
          id: generateChunkId(text),
          text,
          documentId,
        },
      });
    }
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

    const processed: IProcessed[] = [];
    const resultsFilter = results.filter((value) => value.score >= minScore);

    const processedIds: string[] = [];

    for (const result of resultsFilter) {
      const chain = result.metadata?.chain as string[];
      if (chain) {
        if (!processedIds.includes(result.metadata?.id)) {
          let text = "";

          const result2: any[] = await prisma.$queryRaw`
          SELECT id, metadata
          FROM "web_index"
          WHERE metadata->>'id' IN (${Prisma.join(chain)})
          `;

          const parts = result2.map((value) => value.metadata) as {
            id: string;
            url: string;
            text: string;
            chain: string[];
          }[];

          for (const uuid of chain) {
            const part = parts.find((part) => part?.id === uuid);
            if (part) {
              text += ` ` + part?.text;
            }
            processedIds.push(uuid);
          }
          processed.push({
            url: result.metadata?.url,
            score: result.score,
            text,
          });
        }
      } else {
        processed.push({
          url: result.metadata?.url,
          score: result.score,
          text: result.metadata?.text,
        });
      }
    }

    return processed;
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
  async syncChunks(documentId: string) {
    const newChunkIds = this.chunks.map((t) => {
      return {
        id: t.metadata.id,
        document_id: t.metadata.documentId,
      };
    });

    /*
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const id of newChunkIds.map((t) => t.id)) {
      if (seen.has(id)) {
        duplicates.push(id);
      } else {
        seen.add(id);
      }
    }

    console.log(`Total duplicados: ${duplicates.length}`);
    console.log("Ejemplos de duplicados:", duplicates.slice(0, 20));
    for (const id of duplicates) {
      const chunk = this.chunks.filter((t) => t.metadata.id === id);
      console.log(chunk);
    }
      */

    // Se consulta solo los IDs existentes para este documento
    const existing = await prisma.chunks.findMany({
      where: { document_id: documentId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((c) => c.id));

    // Obtener array de IDs de nuevos chunks
    const newChunkIdsArray = newChunkIds.map((t) => t.id);

    // Calcular cuáles son nuevos y cuáles eliminar
    const toInsert = newChunkIds.filter((chunk) => !existingIds.has(chunk.id));
    const toDelete = Array.from(existingIds).filter(
      (id) => !newChunkIdsArray.includes(id)
    );

    // Sincronización en la tabla de chunks
    await prisma.$transaction([
      ...(toInsert.length > 0
        ? [
            prisma.chunks.createMany({
              data: toInsert,
              skipDuplicates: true, // ← AÑADE ESTO para evitar errores de duplicados
            }),
          ]
        : []),

      ...(toDelete.length > 0
        ? [
            prisma.chunks.deleteMany({
              where: {
                document_id: documentId,
                id: { in: toDelete },
              },
            }),
          ]
        : []),
    ]);

    // Sincronización en la tabla de vectores
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

    // Crear un Set de IDs que se insertaron para filtrado eficiente
    const insertedIds = new Set(toInsert.map((chunk) => chunk.id));
    this.chunks = this.chunks.filter((t) => insertedIds.has(t.metadata.id));

    logger.info(`Sincronizacion de Documento: ${documentId}`);
    logger.info(`Nuevos Chunks: ${toInsert.length}`);
    logger.info(`Eliminados/editados: ${toDelete.length}`);
  }
}
