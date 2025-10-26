import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';


export function htmlToCleanText(html: string): string {
  // Pre-limpieza: remover CSS responsive antes de procesar
  const cleanedHTML = html.replace(/@media[^}]+\{[^}]+\}[^}]*\}/g, '');

  return htmlToText(cleanedHTML, {
    wordwrap: false,
    selectors: [
      { selector: 'header', format: 'skip' },
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'nav', format: 'skip' },
      { selector: 'footer', format: 'skip' },
      { selector: 'a', format: 'skip' },
      { 
        selector: 'table',
        format: 'dataTable',
      },
    ] 
  },
).replace(/content: "[^"]+"/g, '') // Limpiar contenido CSS residual
  .replace(/\n\s*\n\s*\n/g, '\n\n') // Limpiar múltiples saltos de línea
  .trim();;
}

export function splitByArticles(html: string) {
  const $ = cheerio.load(html);
  const chunks: string[] = [];
  
  // Dividir por artículos
  $('article').each((i, elem) => {
    chunks.push(htmlToCleanText($(elem).text().trim()));
  });
  
  // Si no hay artículos, dividir por encabezados
  if (chunks.length === 0) {
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const sectionContent = htmlToCleanText($(elem).nextUntil('h1, h2, h3, h4, h5, h6').text());
      chunks.push($(elem).text() + ' ' + sectionContent);
    });
  }
  
  return chunks;
}

