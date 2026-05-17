import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import PerfilScreen from '@/app/user'; // Ajusta la ruta segons on tinguis l'arxiu user.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';
import { appFetch } from '@/services/appFetch';

// 1. SILENCIEM L'AVÍS DE SafeAreaView (Sense tocar el teu codi original)
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.SafeAreaView = rn.View; // Transformem el SafeAreaView obsolet en un View normal durant el test
  return rn;
});

// 2. MOCK DE LES LLIBRERIES EXTERNES I NATIVES
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      capture: jest.fn().mockResolvedValue('file://imatge-simulada.jpg'),
    }));
    return <View testID="view-shot-mock">{props.children}</View>;
  });
});

// Mock del router
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ userId: '1' }),
}));

// Mock dels contextos
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

// Mock de la crida a l'API
jest.mock('@/services/appFetch', () => ({
  appFetch: jest.fn(),
}));

describe('Funcionalitat de Compartir a Instagram (PerfilScreen)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Simulem un usuari loguejat
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, username: 'TestUser', email: 'test@test.com' },
      setUser: jest.fn(),
    });

    // Simulem que l'API retorna el perfil correctament
    (appFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'TestUser',
        email: 'test@test.com',
        punts: 150,
        created_at: '2023-01-01',
        premium: false,
        admin: false,
        empresa: false
      }),
    });

    // Espiem les alertes
    jest.spyOn(Alert, 'alert');
  });

  it('hauria de fer una captura i compartir si Sharing està disponible', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(<PerfilScreen />);

    // Esperem que carregui el perfil
    await waitFor(() => expect(getByText('TestUser')).toBeTruthy());

    // Busquem el botó amb el text EXACTE de user.tsx
    const shareButton = getByText('Comparte tu perfil!');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    });

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file://imatge-simulada.jpg',
      expect.objectContaining({
        mimeType: 'image/jpeg',
        dialogTitle: 'Comparte tu perfil de e-Go',
      })
    );
  });

  it('hauria de mostrar una alerta si Sharing no està disponible en el dispositiu', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => expect(getByText('TestUser')).toBeTruthy());

    const shareButton = getByText('Comparte tu perfil!');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    });

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'El uso compartido no está disponible en este dispositivo'
    );
  });
});