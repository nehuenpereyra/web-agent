import crypto from "crypto";

export function generateChunkId(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}