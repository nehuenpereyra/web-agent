import { promises as fs } from 'fs';
import path from 'path';

/**
 * Type of the callback function
 */
type FileProcessor = (filePath: string, content: string) => Promise<void> | void;

/**
 * Recursively traverse a directory and process each file with the given callback
 * @param dir Directory path
 * @param processFile Callback to process each file
 */
export async function traverseDirectory(dir: string, processFile: FileProcessor): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await traverseDirectory(fullPath, processFile);
    } else if (entry.isFile()) {
      const content = await fs.readFile(fullPath, 'utf-8');
      await processFile(fullPath, content);
    }
  }
}