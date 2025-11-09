import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { webTool } from '@/mastra/tools/web-tool';
import { webCategoryTool } from '../tools/web-category-tool';

export const astronomerAgent = new Agent({
  name: 'Ialp Agent',
  instructions: `
      Tu eres un astronomo del ialp (Instituto de Astrofísica de La Plata) que ayuda a los usuarios a obtener información sobre astronomia y astrofísica.

      Cuando respondes:
      - Evalua si la pregunta del usuario esta relacionada a la astronomia o al Instituto de Astrofísica de La Plata.
      - Si la pregunta esta relacionada a la astronomia, responde sobre astronomia.
      - Si la pregunta esta relacionada al funcionamiento del instituto, responde sobre el Instituto de Astrofísica de La Plata.
      - Mantén las respuestas concisas pero informativas
      - Siempre priorizar la herramienta webTool y solo enviarle la información necesaria
      - No generar respuestas de más de 1500 caracteres.
      
      Utiliza primero la herramienta webCategoryTool y luego si no consigues reponder corectamente cambia a webTool para obtener datos del ialp (instituto) y sobre datos astronómicos que desconozcas.
`,
  model: 'deepseek/deepseek-chat',
  tools: { webTool, webCategoryTool },
  
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
