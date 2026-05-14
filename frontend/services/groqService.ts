import { GROQ_API_KEY, GROQ_API_URL } from '../constants/api';

const SYSTEM_PROMPT = `
Eres el asistente de soporte técnico de e-Go.
Conoces perfectamente la app: búsqueda de cargadores, filtros de potencia, favoritos y pagos.
Si el usuario pregunta algo fuera de contexto, redirígelo amablemente a temas de movilidad eléctrica.
`;

export const fetchGroqResponse = async (chatHistory: {role: string, content: string}[]) => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...chatHistory
        ],
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    return "Error de conexión con el asistente.";
  }
};