import { v4 as uuidv4 } from "uuid";

import { PgVector } from "@mastra/pg";
import ollama from "ollama";

import { Pool } from "pg";
import { splitTextSmart } from "../utils/split-text-smart";
import { envs } from "@/config/envs";
import { logger } from "@/config/logger";

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

  public addText(text: string, customMetadata: Record<string, any>) {
    if (text.length > this.maxChunkSize) {
      const splitText = splitTextSmart(text, this.maxChunkSize);
      const ids = Array.from({ length: splitText.length }, () => uuidv4());
      splitText.forEach((text, index) => {
        this.chunks.push({
          content: text,
          metadata: {
            ...customMetadata,
            id: ids[index],
            chain: ids,
            text,
          },
        });
      });
    } else {
      this.chunks.push({
        content: text,
        metadata: {
          ...customMetadata,
          id: uuidv4(),
          text,
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

    const pool = new Pool({
      host: "localhost",
      port: 5433,
      database: "vector_db",
      user: "postgres",
      password: "postgres",
    });

    for (const result of resultsFilter) {
      const chain = result.metadata?.chain as string[];
      if (chain) {
        if (!processedIds.includes(result.metadata?.id)) {
          let text = "";
          const result2 = await pool.query(
            `
            SELECT * FROM ${this.indexName} 
            WHERE metadata->>'id' IN (${(chain ?? [])
              .map((_, i) => `$${i + 1}`)
              .join(", ")})
          `,
            chain ?? []
          );
          const parts = result2.rows.map((value) => value.metadata) as {
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
    await pool.end();

    return processed;
  }
  async generateEmbeddings() {
    const embeddings = [];
    
    logger.info(`Text Embedding Model: ${this.modelName}`);
    logger.info(`Text Embedding Model Dimention: ${this.dimension}`);
    logger.info(`Total chunks: ${this.chunks.length}`);

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
