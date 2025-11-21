import { DomainScraper } from "../scraping/domain-scraper";
import { slugToTitle } from "../utils/slug-to-title";
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
    await ragSectionProcessor.add(page.html, page.url, 'html' ,[slugToTitle(page.url)], 'ialp_web',);
  }

  await ragSectionProcessor.clearSegments('ialp_web');
  await ragSectionProcessor.info();
};

main();
