//Testig del servicio de Groq
//Este test verifica que la lógica de comunicación con la API de Groq sea correcta y maneje bien
//los errores sin depender de una conexión real (usando mocks)
import { fetchGroqResponse } from '../../services/groqService';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

describe('groqService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    //Definimos el mock de fetch con el tipo correcto de TypeScript
    globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  test('debe devolver la respuesta de la IA correctamente', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Hola, soy tu asistente.' } }]
    };

    //Usamos el casting (as jest.MockedFunction...) para que TypeScript sepa que podemos usar mockResolvedValueOnce
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response); //Forzamos a que lo trate como una respuesta válida de Fetch

    const messages = [{ role: 'user', content: 'Hola' }];
    const result = await fetchGroqResponse(messages);

    expect(result).toBe('Hola, soy tu asistente.');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('groq.com'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer'),
        }),
      })
    );
  });

  test('debe devolver un mensaje de error si la petición falla', async () => {
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network Error'));

    const result = await fetchGroqResponse([]);
    expect(result).toBe('Error de conexión con el asistente.');
  });
});