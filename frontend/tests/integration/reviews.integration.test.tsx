import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { StationBottomSheet } from '@/components/StationBottomSheet';
import { useAuth } from '@/contexts/AuthContext';

// --- MOCKS DE L'ENTORN I LLIBRERIES ---
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/constants/api', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// Mockegem el BottomSheet per poder-lo testejar com una View normal a memòria
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn() }));
      return <View testID="bottom-sheet">{props.children}</View>;
    }),
    BottomSheetScrollView: (props: any) => <ScrollView>{props.children}</ScrollView>,
  };
});

// Mockegem els subcomponents que no volem testejar aquí
jest.mock('@/components/FavoriteButton', () => ({ FavoriteButton: () => null }));
jest.mock('@/components/ChargingTimerDisplay', () => ({ ChargingTimerDisplay: () => null }));
jest.mock('@/components/ChargingActionCard', () => ({ ChargingActionCard: () => null }));
jest.mock('@/components/StartChargingButton', () => ({ StartChargingButton: () => null }));

describe('StationBottomSheet - Integració de Ressenyes', () => {
  const mockStation = {
    id: 10,
    adreca: 'Carrer Fals 123',
    municipi: 'Barcelona',
    kw: '50',
    ac_dc: 'DC',
    tipus_connexio: 'CCS',
  };

  const defaultProps = {
    station: mockStation,
    onClose: jest.fn(),
    isFavorite: false,
    onToggleFavorite: jest.fn(),
    userLocation: null,
    isCharging: false,
    elapsedSeconds: 0,
    distanceToStation: null,
    onStartCharging: jest.fn() as any,
    onFinishCharging: jest.fn(),
    onCancelCharging: jest.fn(),
    chargingError: '',
    setChargingError: jest.fn(),
    onStartNavigation: jest.fn(),
    onOpenIncidenciaForm: jest.fn(),
    onSolvedIncidencia: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Usuari loguejat per defecte als tests
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, email: 'test@test.com', username: 'Tester', token: 'fake-token' },
    });

    // Mockejar el fetch de forma global
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      // 1. GET /reviews
      if (url.includes('/reviews') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              puntuacio: 4,
              comentari: 'Molt bon lloc!',
              data_publicacio: '2026-05-14T10:00:00.000Z',
              data_actualitzacio: '2026-05-14T10:00:00.000Z',
              usuari_id: 2,
              username: 'AltreUsuari',
              likes_count: 5,
              user_has_liked: false
            }
          ],
        } as any;
      }

      // Qualsevol petició de POST, PUT o DELETE retorna 200 OK
      return { ok: true, json: async () => ({}) } as any;
    }) as unknown as typeof fetch;
  });

  test('TC1: Llista ressenyes al muntar i mostra la mitjana', async () => {
    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      // Comprovem que ha fet el GET
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/stations/10/reviews?userId=1'));
      // Comprovem que es pinta el comentari
      expect(getByText('Molt bon lloc!')).toBeTruthy();
      expect(getByText('AltreUsuari')).toBeTruthy();
      // Comprovem que es calcula la mitjana (4.0)
      expect(getByText('4.0')).toBeTruthy();
    });
  });

  test('TC2: L\'usuari no loguejat veu un missatge i NO veu el botó d\'afegir ressenya', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null }); // Desloguejat

    const { getByText, queryByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Inicia sesión para dejar una valoración.')).toBeTruthy();
      expect(queryByText('add')).toBeNull(); // El FAB Button de + fa servir la icona 'add'
    });
  });

  test('TC3: Afegir una nova ressenya i refrescar la llista', async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(<StationBottomSheet {...defaultProps} />);

    // Esperem que carregui la llista inicial
    await waitFor(() => expect(getByText('Molt bon lloc!')).toBeTruthy());

    // 1. Obrim el formulari prement el botó flotant (+)
    fireEvent.press(getByText('add'));

    // 2. Omplim el formulari (Puntua 5 estrelles i text)
    // Com que StarRating pinta 5 icones 'star-border' quan està a 0, agafem l'última
    const stars = getAllByText('star-border');
    fireEvent.press(stars[4]); // Clica la 5a estrella

    fireEvent.changeText(getByPlaceholderText('Escribe tu comentario...'), 'Càrrega molt ràpida');

    // 3. Enviem
    fireEvent.press(getByText('Publicar'));

    // 4. Comprovem la crida POST
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stations/10/reviews'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  test('TC4: Mostrar alert si intentem publicar sense estrelles', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('add')).toBeTruthy());

    fireEvent.press(getByText('add'));
    fireEvent.press(getByText('Publicar')); // No toquem les estrelles

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Por favor, selecciona una puntuación.');
    });

    alertSpy.mockRestore();
  });

  test('TC5: Editar una ressenya pròpia', async () => {
    // Retornarem una ressenya on el usuari_id = 1 (el nostre Mocked User)
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/reviews') && !url.includes('/like')) {
        return {
          ok: true,
          json: async () => [{
            id: 88, puntuacio: 3, comentari: 'Antic', usuari_id: 1, username: 'Tester', likes_count: 0
          }]
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    const { getByText, getByPlaceholderText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('Antic')).toBeTruthy());

    // 1. Fem clic a "Editar" (només apareix si és nostra)
    fireEvent.press(getByText('Editar'));

    // 2. El form s'ha obert i el text antic hi és
    await waitFor(() => {
      expect(getByText('Edita tu opinión')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Escribe tu comentario...'), 'Actualitzat!');
    fireEvent.press(getByText('Publicar'));

    // 3. Validem que envia un PUT a l'id correcte
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/88'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  test('TC6: Esborrar una ressenya pròpia demana confirmació', async () => {
    // Mateix setup que TC5
    (globalThis.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/reviews') && !url.includes('/like')) {
        return {
          ok: true,
          json: async () => [{ id: 99, puntuacio: 3, usuari_id: 1, username: 'Tester', likes_count: 0 }]
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('Eliminar')).toBeTruthy());

    // 1. Cliquem Eliminar
    fireEvent.press(getByText('Eliminar'));

    // 2. Es mostra l'Alert
    expect(alertSpy).toHaveBeenCalledWith(
      'Eliminar valoración',
      '¿Estás seguro?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Eliminar', style: 'destructive' })
      ])
    );

    // 3. Simulem que l'usuari clica "Eliminar" dins l'Alert
    const deleteButton = alertSpy.mock.calls[0][2]?.find(btn => btn.text === 'Eliminar');

    await act(async () => {
      if (deleteButton?.onPress) deleteButton.onPress();
    });

    // 4. Validem la crida DELETE
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews/99'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    alertSpy.mockRestore();
  });

  test('TC7: Fer Toggle Like crida l\'API i canvia el valorador a l\'instant', async () => {
    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    // Ressenya carregada per defecte amb 5 likes i `user_has_liked = false` (icona `favorite-border`)
    await waitFor(() => {
      expect(getByText('5')).toBeTruthy();
      expect(getByText('favorite-border')).toBeTruthy();
    });

    // 1. Fem clic a l'icona del cor per donar Like
    fireEvent.press(getByText('favorite-border'));

    // 2. Optimistic Update: Pinta un 6 i la icona "favorite" (cor ple) immediatament
    await waitFor(() => {
      expect(getByText('6')).toBeTruthy();
      expect(getByText('favorite')).toBeTruthy();
    });

    // 3. Comprovem la crida POST /like
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/reviews/1/like'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});