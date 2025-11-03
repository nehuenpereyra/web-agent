import * as puppeteer from "puppeteer";
import { PDFParse } from "pdf-parse";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { logger } from "@/config/logger";
import fs from "fs";
import path from "path";

export interface ScrapedPage {
  url: string;
  html: string;
  pdfBuffer?: Buffer;
  links: string[];
  isPdf?: boolean;
}

interface ExtractedPDF {
  text: string;
  metadata: any;
  numpages: number;
}

export class DomainScraper {
  private browser: puppeteer.Browser | null = null;
  private visited = new Set<string>();
  private results: ScrapedPage[] = [];
  private useCache: boolean = true;

  constructor({ useCache }: { useCache?: boolean } = {}) {
    if (useCache) this.useCache = useCache;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  private async scrapePage(
    url: string,
    depth: number,
    maxDepth: number,
    domain: string
  ) {
    if (depth > maxDepth || this.visited.has(url)) return;

    this.visited.add(url);
    logger.info(`Scraping: ${url} (depth: ${depth})`);

    try {
      const page = await this.browser!.newPage();

      // Configurar para interceptar y descargar PDFs
      const pdfBuffers: Map<string, Buffer> = new Map();

      page.on("response", async (response) => {
        const responseUrl = response.url();

        // Detectar y descargar PDFs
        if (
          responseUrl.endsWith(".pdf") ||
          response.headers()["content-type"]?.includes("application/pdf")
        ) {
          console.log(`📄 PDF detectado: ${responseUrl}`);
          try {
            const buffer = await response.buffer();
            pdfBuffers.set(responseUrl, buffer);
          } catch (error) {
            console.log(`Error descargando PDF: ${responseUrl}`, error);
          }
        }
      });

      // Navegar a la página
      await page.goto(url, { waitUntil: "networkidle2" });

      const scrapedData: ScrapedPage = {
        url,
        html: "",
        links: [],
        isPdf: false,
      };

      // Si es un PDF, guardar el buffer
      if (url.endsWith(".pdf") && pdfBuffers.has(url)) {
        scrapedData.pdfBuffer = pdfBuffers.get(url);
        scrapedData.isPdf = true;
        console.log(`✅ PDF guardado: ${url}`);
      } else {
        // Si es HTML, obtener contenido y enlaces
        scrapedData.html = await page.content();

        // Obtener enlaces (AHORA INCLUYENDO PDFs)
        const links = await page.$$eval(
          "a[href]",
          (anchors: HTMLAnchorElement[], domain: string) => {
            return anchors
              .map((anchor) => anchor.href)
              .filter((href) => {
                try {
                  const url = new URL(href);
                  return (
                    url.hostname === domain &&
                    !href.includes("#") && // Solo excluir anchors
                    !href.startsWith("mailto:") &&
                    !href.startsWith("tel:")
                  );
                } catch {
                  return false;
                }
              });
          },
          domain
        );

        scrapedData.links = links;
      }

      this.results.push(scrapedData);
      await page.close();

      // Navegar a enlaces (AHORA INCLUYENDO PDFs para procesarlos)
      if (depth < maxDepth) {
        for (const link of scrapedData.links) {
          await this.scrapePage(link, depth + 1, maxDepth, domain);
        }
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  async scrapeDomain(baseUrl: string, maxDepth: number = 2) {
    if (!this.browser) await this.initialize();

    const basePath = "./src/scraping";
    const cacheDir = path.join(basePath, "data", "cache");

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFile = path.join(cacheDir, "web.json");

    if (!this.useCache || !existsSync(cacheFile)) {
      await this.scrapePage(baseUrl, 0, maxDepth, new URL(baseUrl).hostname);

      writeFileSync(cacheFile, JSON.stringify(this.results, null, 2));
    } else {
      const results = JSON.parse(readFileSync(cacheFile, "utf-8"));
      this.results = results as ScrapedPage[];
      logger.info(`Using web page cache`);
    }

    const pdfPages = this.results.filter((page) => page.pdfBuffer);
    const htmlPages = this.getHtmlPages();

    logger.info(`Total pages: ${htmlPages.length + pdfPages.length}`);
    logger.info(`Total PDFs : ${pdfPages.length}`);
    logger.info(`Total HTMLs : ${htmlPages.length}`);

    this.close();
    return this.results;
  }

  // Método para obtener solo los PDFs encontrados
  getPDFs() {
    return this.results.filter((page) => page.pdfBuffer || page.isPdf);
  }

  getHtmlPages() {
    return this.results.filter((page) => !page.isPdf);
  }

  static async extractTextFromBuffer(pdfBuffer: Buffer): Promise<ExtractedPDF> {
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const info = await parser.getInfo();
      const textResult = await parser.getText();
      await parser.destroy();

      return {
        text: textResult.text,
        metadata: info.metadata,
        numpages: info.total,
      };
    } catch (error) {
      console.error("Error extrayendo texto del PDF:", error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async getDataFromCache() {}
}
