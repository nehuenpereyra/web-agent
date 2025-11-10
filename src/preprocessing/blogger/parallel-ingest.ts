// main.ts - REEMPLAZA TODO LO ANTERIOR
import fs from 'fs';
import Piscina from 'piscina';
import { fileURLToPath } from 'url';
import path from 'path';
import { RAGSectionProcessor } from '@/rag/rag-section-processor';
import { chain } from 'stream-chain';
import StreamArray from 'stream-json/streamers/StreamArray.js';
import { Blog } from './types';

class MemoryMonitor {
    static start() {
        setInterval(() => {
            const memory = process.memoryUsage();
            console.log(`🧠 Memoria - Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB, RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
        }, 5000); // Cada 5 segundos
    }
}

export interface BlogTask {
    blog: Blog;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_CONCURRENCY = 8;
const BATCH_SIZE = 10; // Procesa solo 10 blogs a la vez

const piscina = new Piscina({
    filename: path.join(__dirname, 'worker-blog-processor.ts'),
    maxThreads: MAX_CONCURRENCY
});

async function processBatch(blogs: Blog[]): Promise<void> {
    const promises = blogs.map(blog => piscina.run({ blog }));
    const results = await Promise.allSettled(promises);
    
    // Log de resultados (opcional pero útil)
    results.forEach((result, idx) => {
        if (result.status === 'rejected') {
            console.error(`❌ Blog ${blogs[idx].id} falló:`, result.reason);
        }
    });
}

async function main() {
    console.log('🚀 Iniciando procesamiento...');
    MemoryMonitor.start();
    
    const filePath = path.join(__dirname, 'resumenlatinoamericano_posts.json');
    const pipeline = chain([
        fs.createReadStream(filePath),
        StreamArray.withParser(),
    ]);

    let batch: Blog[] = [];
    let processedCount = 0;

    for await (const { value } of pipeline) {
        batch.push(value);
        
        // Cuando el lote está lleno, procesa y limpia memoria
        if (batch.length >= BATCH_SIZE) {
            console.log(`📦 Procesando lote de ${batch.length} blogs (total: ${processedCount})`);
            await processBatch(batch);
            processedCount += batch.length;
            
            // ✅ CRÍTICO: Limpia el lote y fuerza GC
            batch = [];
            if (global.gc) {
                global.gc();
            }
        }
    }

    // Procesa el último lote si queda algo
    if (batch.length > 0) {
        console.log(`📦 Procesando último lote de ${batch.length} blogs`);
        await processBatch(batch);
        processedCount += batch.length;
    }

    console.log(`✅ Todos los blogs procesados: ${processedCount}`);

    // ✅ Ahora sí, cierra el pool
    await piscina.destroy();
    console.log('🛑 Pool de workers destruido');

    // ✅ Procesa resultados finales
    const ragSectionProcessor = new RAGSectionProcessor(250);
    await ragSectionProcessor.initialize();
    await ragSectionProcessor.clearSegments('resumenlatinoamericano_posts');
    await ragSectionProcessor.info();
    await ragSectionProcessor.close();
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});