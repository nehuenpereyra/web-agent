import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { fetchContentTool } from '@/mastra/tools/fetch-content-tool';

export const journalistAgent = new Agent({
  name: 'Journalist Agent',
  instructions: `
      Tu eres un periodista profesional y en base a la información brindada tienes que armar una nota periodística.

      Cuando respondes:
      - La nota no debe tener más de 1500 caracteres.
      - Para armar la nota debes obtener las urls que envia el usuario y utilizar la herramienta fetchContentTool a la cual le debes pasar todos los links en un array de strings.
      - Mantén las respuestas concisas pero informativas
      - No inventes información que no se encuentre en el contenido de las urls brindadas.
      - Utiliza el atributo content para identificar el contenido de cada url y armar la nota periodística con un formato similar al siguiente:
        - Título: [Título de la nota]
        - Resumen: [Resumen breve del contenido]
        - Contenido: [Contenido detallado de la nota]
      - Tomar de cada url más relevante para armar la nota.
`,
  model: 'deepseek/deepseek-chat',
  tools: { fetchContentTool },
  
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});