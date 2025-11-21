import axios from "axios";
import { envs } from "@/config/envs";

const OLLAMA_URL = "http://localhost:11434";

// Cliente Axios con configuración base
const ollama = axios.create({
  baseURL: OLLAMA_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

async function setupOllama() {
  const modelName = envs.TEXT_EMBEDDING_MODEL_NAME;

  try {
    console.log("🔍 Verificando si Ollama responde en el puerto 11434...");

    // Verificar conexión
    await ollama.get("/api/tags");
    console.log("✅ Ollama está accesible");

    console.log(`📥 Verificando modelo ${modelName}...`);

    // Obtener lista de modelos
    const { data: tags } = await ollama.get("/api/tags");

    const exists = tags.models.some((m: any) => m.name === modelName);

    if (!exists) {
      console.log(`⬇️  Modelo ${modelName} no encontrado. Descargando...`);

      // API /api/pull
      await ollama.post("/api/pull", { name: modelName });

      console.log("✅ Modelo descargado correctamente");
    } else {
      console.log("✅ Modelo ya está instalado");
    }

  } catch (err: any) {
    console.error(`
❌ No se pudo conectar a Ollama en http://localhost:11434

Detalles: ${err.message}

Por favor verifica:

- ¿El contenedor "ollama" está corriendo?
- ¿El puerto 11434 está expuesto?
- ¿Tu contenedor "app" usa network_mode: host?
- ¿Podes acceder desde el host con "curl localhost:11434/api/tags"?

`);
    process.exit(1);
  }
}

setupOllama();
