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
  await ragSectionProcessor.initialize()

  for (const page of scraper.getHtmlPages()) {
    const segments = splitByArticles(page.html);
    for (const segment of segments) {
      await ragSectionProcessor.addSegment(segment, 'ialp_web', [slugToTitle(page.url)]);
    }
  }

  await ragSectionProcessor.clearSegments('ialp_web');
  await ragSectionProcessor.info();

  if(envs.GENERATE_CSV_CHUNKS && ragSectionProcessor
      .getChunks().length > 0)
  generateCsv(
    ragSectionProcessor
      .getChunks()
      .map((value) => ({ ...value.metadata, text: value.content }))
  );

  
};

main();
