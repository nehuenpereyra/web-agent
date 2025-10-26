import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  POSTGRES_CONNECTION_STRING: z
    .string()
    .regex(
      /^postgresql:\/\/[a-zA-Z0-9_]+(:[a-zA-Z0-9_]+)?@[a-zA-Z0-9_.-]+(:\d+)?\/[a-zA-Z0-9_-]+$/,
      "Invalid pgvector connection string"
    ),
  WEB_DOMAIN: z
    .string()
    .regex(/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, "Invalid domain"),
  TEXT_EMBEDDING_MODEL_NAME: z.string(),
  TEXT_EMBEDDING_MODEL_DIM: z.coerce.number(),
  GENERATE_CSV_CHUNKS:z.string().default("false").transform((val) => val === 'true' || val === '1')
});

const envs = envSchema.parse(process.env);

export { envs };
