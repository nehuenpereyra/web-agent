import { DomainScraper } from "../scraping/domain-scraper";
import { splitByArticles } from "../scraping/formatters/html-formatter";
import { slugToTitle } from "../utils/slug-to-title";
import { generateCsv } from "../utils/generate-csv";
import { RAGSectionProcessor } from "@/rag/rag-section-processor";
import { envs } from "@/config/envs";

const main = async () => {
  const scraper = new DomainScraper();

  await scraper.scrapeDomain(
    envs.WEB_DOMAIN,
    2
  );

  const ragSectionProcessor = new RAGSectionProcessor(250);

  for (const page of scraper.getHtmlPages()) {
    const chunks = splitByArticles(page.html);
    for (const chunk of chunks) {
      ragSectionProcessor.addText(chunk, {
        url: page.url,
        tag: slugToTitle(page.url),
      }, 'https://ialp.fcaglp.unlp.edu.ar', slugToTitle(page.url));
    }
  }

  await ragSectionProcessor.syncChunks('https://ialp.fcaglp.unlp.edu.ar')

  await ragSectionProcessor.generateEmbeddings();

  if(envs.GENERATE_CSV_CHUNKS && ragSectionProcessor
      .getChunks().length > 0)
  generateCsv(
    ragSectionProcessor
      .getChunks()
      .map((value) => ({ ...value.metadata, text: value.content }))
  );
};

main();
