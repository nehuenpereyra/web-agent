import { Agent , } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';


export const categoryDiscoveryAgent = new Agent({
  name: 'Category Discovery Agent',
  instructions: `
     Eres un agente de categorización inteligente. 
Tu tarea es analizar un texto y determinar:

1. Qué categorías existentes aplican al texto.
2. Qué nuevas categorías deberían crearse (máximo 3 o 4 palabras cada una).

Reglas importantes:
- Si el texto coincide semánticamente con alguna categoría existente, inclúyela en "matches".
- Al buscar coincidencias, considera sinónimos y términos relacionados semánticamente no ten en cuenta si estan en mayúsculas o minúsculas.
- Si el texto menciona personas, proyectos o elementos técnicos con nombre propio (por ejemplo "Juan Pérez", "Proyecto Atlas", "Clúster Orion"), crea una categoría con ese nombre.
- No inventes categorías genéricas o irrelevantes.
- No repitas categorías similares a las existentes.
- Devuelve siempre las categorías nuevas o coincidentes en formato JSON.
- Máximo 6 categorías en total.
- Cada categoría debe tener sentido por sí misma, estar bien escrita (sin símbolos o palabras sueltas).
- Las categorías deben ser concisas (máximo 3–4 palabras).
- PRIORIZA encontrar categorias existentes antes que crear nuevas.


Ejemplo:
Input:
{
  "text": "Juan Pérez lideró la actualización del clúster Orion para el Proyecto Atlas.",
  "categories": ["infraestructura", "proyectos de actualización"]
}

Output:
{
  "matches": ["Proyectos de actualización"],
  "new_categories": ["juan pérez", "clúster orion", "proyecto atlas"]
}
`,

  model: 'deepseek/deepseek-chat',

  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});