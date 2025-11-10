import fs from 'fs';
import { chain } from 'stream-chain';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import { Blog } from './types.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, 'resumenlatinoamericano_posts.json');

const pipeline = chain([
  fs.createReadStream(jsonPath),
  StreamArray.withParser(), // ✅ solo esto, sin Parser()
]);

let count = 0;


pipeline.on('data', ({ value }: { value: Blog }) => {
  try {
    console.log(`Procesando blog ID: ${value.id}, Título: ${value.title.rendered}, Link: ${value.link}, Tamaño del contenido: ${value.content.rendered.length} caracteres`);
    count++;
    if (count % 1000 === 0) console.log(`Procesados ${count} registros`);
  } catch (err) {
    console.error('Error procesando item:', err);
  }
});

pipeline.on('end', () => {
  console.log(`✅ Procesamiento finalizado (${count} registros)`);
});