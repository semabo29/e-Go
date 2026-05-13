//Testig del servicio de Groq
//Este test verifica que la lógica de comunicación con la API de Groq sea correcta y maneje bien
//los errores sin depender de una conexión real (usando mocks)
import { fetchGroqResponse } from '../../services/groqService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('groqService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn() as jest.Mock;
  });

  test('debe devolver la respuesta de la IA correctamente', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Hola, soy tu asistente.' } }]
    };

    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

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
    (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

    const result = await fetchGroqResponse([]);
    expect(result).toBe('Error de conexión con el asistente.');
  });
});