import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import SupportChatScreen from '@/app/support-chat';
import { fetchGroqResponse } from '../../services/groqService';

//Mock del servicio de IA
jest.mock('../../services/groqService', () => ({
  fetchGroqResponse: jest.fn(),
}));

//Mock de la imagen del avatar de la IA
jest.mock('../../assets/images/avatar_asistente_IA.png', () => 'test-file-stub');

//Mock de expo-router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

//Mock de iconos para que 'send' sea detectable como texto
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

//Mock de SafeArea para evitar el error de renderizado en Android
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('SupportChatScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('permite al usuario escribir y recibir un mensaje de la IA', async () => {
    //Simulamos respuesta de la IA
    (fetchGroqResponse as jest.Mock).mockResolvedValueOnce('¡Hola! Soy Voltix. ¿En qué te ayudo?');

    const { getByPlaceholderText, getByText } = render(<SupportChatScreen />);

    //Verificamos el mensaje de bienvenida
    expect(getByText(/Hola, soy Voltix/i)).toBeTruthy();

    const input = getByPlaceholderText('Escribe aquí...');
    const sendButton = getByText('send');

    //Simular escritura y envío
    fireEvent.changeText(input, '¿Cómo pago?');
    fireEvent.press(sendButton);

    //El mensaje del usuario debe aparecer
    expect(getByText('¿Cómo pago?')).toBeTruthy();

    //La respuesta de la IA debe aparecer tras la "llamada"
    await waitFor(() => {
      expect(getByText('¡Hola! Soy Voltix. ¿En qué te ayudo?')).toBeTruthy();
    });
  });

  test('el botón de enviar está deshabilitado si el input está vacío', () => {
    const { getByText } = render(<SupportChatScreen />);

    //Buscamos el icono 'send'
    const sendButtonIcon = getByText('send');

    //Buscamos el ancestro que sea el TouchableOpacity (el que tiene la prop disabled)
    let touchableAncestor = sendButtonIcon.parent;
    while (touchableAncestor && !touchableAncestor.props.accessibilityState) {
      touchableAncestor = touchableAncestor.parent;
    }
    //Verificamos que esté deshabilitado inicialmente (input vacío)
    expect(touchableAncestor?.props.accessibilityState?.disabled).toBe(true);
  });

  test('renderiza la cabecera con el título correcto', () => {
    const { getByText } = render(<SupportChatScreen />);
    //Verificamos que el título de la cabecera aparece
    expect(getByText('Soporte e-Go')).toBeTruthy();
  });
});