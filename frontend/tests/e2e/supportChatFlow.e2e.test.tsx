/**
 * Test de Integración UI y Red: Pantalla del Asistente Virtual (Chatbot)
 * * Este test se enfoca exclusivamente en la pantalla de chat de soporte,
 * validando el envío de mensajes del usuario y el renderizado de la respuesta de Groq.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Importamos únicamente la pantalla del chat de soporte
import SupportChatScreen from '@/app/support-chat';

// ==========================================
// MOCKS REQUERIDOS PARA LA PANTALLA DE CHAT
// ==========================================

// Mock de la navegación de Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock del contexto de autenticación (usado para mostrar el nombre de usuario del conductor)
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 7, email: 'e2e-user@ego.com', username: 'VoltDriver' },
    isLoading: false,
  }),
}));

// Mock para interceptar los iconos vectoriales y transformarlos en texto plano legible por Jest
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// Mock para el contexto de área segura (SafeArea) de pantallas móviles
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock del Avatar o recursos estáticos de imagen del bot
jest.mock('../../assets/images/avatar_asistente_IA.png', () => 'avatar-stub');

// Mapeamos las llaves de traducción a textos reales legibles por el test
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const dic: Record<string, string> = {
        'support.header': 'Asistente Virtual',
        'support.empty': '¿En qué puedo ayudarte?',
        'support.placeholder': 'Escribe aquí...',
      };
      return dic[key] || key;
    },
  }),
}));


describe('Chatbot: Flujo del Asistente Virtual', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Inicializamos el mock de red global limpio para este entorno aislado
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
  });

  test('El usuario envía una pregunta y recibe la respuesta procesada por la API de Groq', async () => {
    // 1. Configuramos la respuesta falsa que el servicio recibirá desde la API de Groq
    const mockApiResponse = {
      choices: [
        {
          message: {
            content: 'Hola VoltDriver, puedes encontrar los cargadores rápidos activando el filtro de más de 50kW.'
          }
        }
      ]
    };

    // Interceptamos la llamada HTTP (fetch) devolviendo nuestro JSON simulado con éxito
    (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    // 2. Renderizamos únicamente el componente de chat
    const { getByPlaceholderText, getByText } = render(<SupportChatScreen />);

    // Validamos el estado de bienvenida inicial provisto por el diccionario del traductor
    expect(getByText('¿En qué puedo ayudarte?')).toBeTruthy();

    // 3. Localizamos los elementos interactivos primordiales (Input y Botón Enviar)
    const inputTexto = getByPlaceholderText('Escribe aquí...');
    const botonEnviar = getByText('send'); // Captura el icono MaterialIcon con nombre 'send'

    expect(inputTexto).toBeTruthy();
    expect(botonEnviar).toBeTruthy();

    // 4. Simulamos la escritura del usuario introduciendo una consulta
    fireEvent.changeText(inputTexto, '¿Cómo busco cargadores rápidos?');

    // 5. El usuario pulsa el botón de enviar
    await act(async () => {
      fireEvent.press(botonEnviar);
    });

    // 6. —— VERIFICACIÓN DE RED ——
    // Comprobamos que el frontend disparó correctamente la petición POST estructurada hacia Groq
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
      const llamadasFetch = (globalThis.fetch as jest.Mock).mock.calls;
      const urlLlamada = String(llamadasFetch[0][0]);
      const opcionesLlamada = llamadasFetch[0][1] as RequestInit;

      expect(urlLlamada).toContain('groq.com');
      expect(opcionesLlamada.method).toBe('POST');
      expect(opcionesLlamada.body).toContain('¿Cómo busco cargadores rápidos?');
    });

    // 7. —— VERIFICACIÓN EN LA INTERFAZ DE USUARIO ——
    // El mensaje enviado por el usuario debe listarse inmediatamente en la burbuja del chat
    expect(getByText('¿Cómo busco cargadores rápidos?')).toBeTruthy();

    // Esperamos a que la promesa se resuelva e inyecte la respuesta simulada de la IA en la pantalla
    await waitFor(() => {
      expect(
        getByText('Hola VoltDriver, puedes encontrar los cargadores rápidos activando el filtro de más de 50kW.')
      ).toBeTruthy();
    });
  });
});