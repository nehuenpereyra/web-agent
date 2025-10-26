import { DomainScraper } from "../domain-scraper";
import fs from "fs";
import path from "path";
import { htmlToCleanText } from "../formatters/html-formatter";
import { envs } from "@/config/envs";
import { logger } from "@/config/logger";

const main = async () => {
  const scraper = new DomainScraper();

  await scraper.scrapeDomain(envs.WEB_DOMAIN, 2);

  const outputDir = "./src/scraping/data/text";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  scraper.getHtmlPages().forEach((page, index) => {
    const filename = `page_${index + 1}.txt`;
    const filePath = path.join(outputDir, filename);

    fs.writeFileSync(filePath, htmlToCleanText(page.html), "utf-8");
  });

  logger.info(`Successfully saved in: ${outputDir}`)
};

main();