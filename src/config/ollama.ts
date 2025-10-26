import { envs } from "@/config/envs";
import { execSync } from "child_process";

function setupOllama() {
  const modelsList = [
    /*
    "nomic-embed-text",
    "paraphrase-multilingual:latest",
    "embeddinggemma:latest"
    */
   envs.TEXT_EMBEDDING_MODEL_NAME
  ];
  try {
    console.log("🔍 Verificando instalación de Ollama...");
    
    // Verificar si Ollama está instalado
    execSync("ollama --version", { stdio: "pipe" });
    console.log("✅ Ollama está instalado");

    modelsList.forEach((modelName) => {
      // Descargar el modelo si no existe
      console.log(`📥 Verificando modelo ${modelName}...`);
      try {
        const models = execSync("ollama list", { encoding: "utf8" });
        if (!models.includes(modelName)) {
          console.log(`⬇️  Descargando modelo ${modelName}...`);
          execSync(`ollama pull ${modelName}`, { stdio: "inherit" });
          console.log("✅ Modelo descargado correctamente");
        } else {
          console.log("✅ Modelo ya está descargado");
        }
      } catch (error) {
        console.log("🚀 Iniciando servicio Ollama...");
        // En producción, deberías manejar esto como un servicio
        console.log("💡 Ejecuta en otra terminal: ollama serve");
        console.log("💡 Luego ejecuta: ollama pull nomic-embed-text");
      }
    });
  } catch (error) {
    console.log(`
      ❌ Ollama no está instalado.
      
      📥 Por favor instala Ollama primero:
      
      macOS: brew install ollama
      Linux: curl -fsSL https://ollama.ai/install.sh | sh
      Windows: Descarga desde https://ollama.ai/download
      
      Luego ejecuta:
      ollama pull nomic-embed-text
    `);
    process.exit(1);
  }
}

setupOllama();
