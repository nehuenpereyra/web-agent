import fs from 'fs';
import { chain } from 'stream-chain';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import { Blog } from './types.js';
import { fileURLToPath } from 'url';
import path from 'path';
import { RAGSectionProcessor } from '@/rag/rag-section-processor.js';
import { slugToTitle } from '@/utils/slug-to-title.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, 'resumenlatinoamericano_posts.json');

// ⚠️ Si el archivo no existe, avisamos antes de intentar leerlo
if (!fs.existsSync(jsonPath)) {
  console.error(`❌ No se encontró el archivo: ${jsonPath}`);
  process.exit(1);
}

const pipeline = chain([
  fs.createReadStream(jsonPath),
  StreamArray.withParser(),
]);

// ⚠️ No se puede usar "await" en el top-level si tu archivo es .ts sin "type": "module" en package.json
// Por eso lo metemos en una función main()
async function main() {
  const ragSectionProcessor = new RAGSectionProcessor(250);
  await ragSectionProcessor.initialize();

  let count = 0;

  // 🧠 IMPORTANTE: evitar funciones async directamente dentro de .on('data')
  // porque no espera las promesas y puede romper el flujo del stream.
  pipeline.on('data', ({ value }: { value: Blog }) => {
    pipeline.pause(); // ⏸️ pausamos el stream mientras procesamos
    (async () => {
      try {
        console.log(`Procesando blog ID: ${value.id}, Título: ${value.title.rendered}`);
        await ragSectionProcessor.add(
          `<strong>${value.title.rendered} </strong>` +
            value.content.rendered
          ,
          value.link,
          [slugToTitle(value.link)],
          'resumenlatinoamericano_posts'
        );
        count++;
        if (count % 1000 === 0) console.log(`Procesados ${count} registros`);
      } catch (err) {
        console.error('Error procesando item:', err);
      } finally {
        pipeline.resume(); // ▶️ reanudamos
      }
    })();
  });

  pipeline.on('end', async () => {
    await ragSectionProcessor.clearSegments('resumenlatinoamericano_posts');
    console.log(`✅ Procesamiento finalizado (${count} registros)`);
    await ragSectionProcessor.info();
  });
}

main().catch((err) => {
  console.error('Error general:', err);
  process.exit(1);
});
