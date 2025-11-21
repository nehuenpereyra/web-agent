import { slugToTitle } from "../utils/slug-to-title";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";
import { traverseDirectory } from "@/preprocessing/text";
import path from 'path';

const main = async () => {
  
  const ragSectionProcessor = new RAGSectionProcessor(250);
  await ragSectionProcessor.initialize()

  const folderPath = path.join(process.cwd(), 'files');

  await traverseDirectory(folderPath, async (filePath, content) => {
    const documentName = slugToTitle(filePath);
    await ragSectionProcessor.add(content, documentName, 'text', [documentName], 'prensadelpueblo');
  });

  await ragSectionProcessor.clearSegments('prensadelpueblo');
  await ragSectionProcessor.info();
};

main();
