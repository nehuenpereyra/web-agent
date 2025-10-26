import { envs } from "@/config/envs";
import { DomainScraper } from "../domain-scraper";
import fs from "fs";
import path from "path";
import { logger } from "@/config/logger";

const main = async () => {
  const scraper = new DomainScraper();

  await scraper.scrapeDomain(envs.WEB_DOMAIN, 2);

  const outputDir = "./src/scraping/data/html";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  scraper.getHtmlPages().forEach((page, index) => {
    const filename = `page_${index + 1}.html`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, page.html, "utf-8");
  });

  logger.info(`Successfully saved in: ${outputDir}`)
};

main();
