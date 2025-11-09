import axios from 'axios';

export async function callModel(endpoint: string, model: string, content: string, format: Record<string, any>) {

 
  try {
    const response = await axios.post(
      endpoint,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content
          }
        ],
        stream: false,
        format
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data
  } catch (error) {
    console.error('Error al llamar a Ollama:', error);
  }
}
