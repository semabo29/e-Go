/**
 * E2E de Flux UI: Crear ressenya -> Editar-la -> Donar Like -> Esborrar-la dins del StationBottomSheet.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Assegura't que la ruta cap al component sigui la correcta al teu projecte
import { StationBottomSheet } from '@/components/StationBottomSheet';
import { useAuth } from '@/contexts/AuthContext';
import * as reviewsApi from '@/services/reviewsApiService';

// --- MOCKS DE CONTEXT I EXTERNS ---
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// Mockegem el BottomSheet perquè es renderitzi com una View normal en els tests
jest.mock('@gorhom/bottom-sheet', () => {
  const react = require('react');
  const { View } = require('react-native');
  const BottomSheet = react.forwardRef(({ children }: any, ref: any) => <View>{children}</View>);
  const BottomSheetScrollView = ({ children }: any) => <View>{children}</View>;
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView,
  };
});

// Mockegem les icones perquè puguem clicar-les pel seu nom (ex: getByText('add'))
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

// Mockegem el component de les Estrelles per poder donar-li una puntuació fàcilment
jest.mock('@/components/StarRating', () => ({
  StarRating: ({ onRatingChange }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={() => onRatingChange && onRatingChange(5)}>
        <Text>Donar 5 estrelles</Text>
      </TouchableOpacity>
    );
  },
}));

// Mockegem les traduccions perquè retornin la mateixa clau
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Ens estalviem els altres components del BottomSheet que no ens interessen per aquest test
jest.mock('@/components/FavoriteButton', () => ({ FavoriteButton: () => null }));
jest.mock('@/components/ChargingTimerDisplay', () => ({ ChargingTimerDisplay: () => null }));
jest.mock('@/components/ChargingActionCard', () => ({ ChargingActionCard: () => null }));
jest.mock('@/components/StartChargingButton', () => ({ StartChargingButton: () => null }));
jest.mock('@/components/StationNearbyEventsCarousel', () => ({ StationNearbyEventsCarousel: () => null }));


describe('E2E: Flux de Ressenyes al StationBottomSheet', () => {
  const mockUseAuth = useAuth as jest.Mock;

  // BASE DE DADES VIRTUAL (Stateful Mock)
  let mockReviews: any[] = [];
  let reviewIdCounter = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReviews = []; // Buidem les ressenyes abans de cada test

    // Simulem un usuari loguejat
    mockUseAuth.mockReturnValue({
      user: { id: 12, email: 'e2e@test.com', username: 'e2e_user', token: 'fake_token' },
    });

    // --- INTERCEPTEM L'API DE RESSENYES ---
    jest.spyOn(reviewsApi, 'getStationReviews').mockImplementation(async () => [...mockReviews]);

    jest.spyOn(reviewsApi, 'addStationReview').mockImplementation(async (stationId, rating, comment, token) => {
      const newReview = {
        id: reviewIdCounter++,
        usuari_id: 12,
        estacio_id: stationId,
        puntuacio: rating,
        comentari: comment,
        likes_count: 0,
        user_has_liked: false,
        username: 'e2e_user',
        data_publicacio: new Date().toISOString(),
        data_actualitzacio: new Date().toISOString(),
      };
      mockReviews.push(newReview);
    });

    jest.spyOn(reviewsApi, 'updateStationReview').mockImplementation(async (reviewId, rating, comment, token) => {
      if (mockReviews[0]) {
        mockReviews[0].comentari = comment;
        mockReviews[0].puntuacio = rating;
        mockReviews[0].data_actualitzacio = new Date().toISOString();
      }
    });

    jest.spyOn(reviewsApi, 'toggleReviewLike').mockImplementation(async () => {
      if (mockReviews[0]) {
        mockReviews[0].likes_count += 1;
        mockReviews[0].user_has_liked = true;
      }
    });

    jest.spyOn(reviewsApi, 'deleteStationReview').mockImplementation(async () => {
      mockReviews.length = 0;
    });
  });

  test('Permet crear, editar, donar like i esborrar una ressenya correctament', async () => {
    // Propietats falses (Dummys) necessàries pel BottomSheet
    const dummyProps = {
      station: { id: 42, latitud: '0', longitud: '0', kw: '50', ac_dc: 'DC', tipus_connexio: 'CCS', adreca: 'Carrer', municipi: 'BCN' },
      onClose: jest.fn(),
      isFavorite: false,
      onToggleFavorite: jest.fn(),
      userLocation: null,
      isCharging: false,
      elapsedSeconds: 0,
      distanceToStation: null,
      onStartCharging: jest.fn(() => Promise.resolve(true)) as any,
      onFinishCharging: jest.fn(),
      onCancelCharging: jest.fn(),
      chargingError: '',
      setChargingError: jest.fn(),
      onStartNavigation: jest.fn(),
      onOpenIncidenciaForm: jest.fn(),
      onSolvedIncidencia: jest.fn(),
    };

    // 1. Renderitzem el Panell de l'Estació
    const { getByText, getByPlaceholderText, queryByText, findByText } = render(
      <StationBottomSheet {...dummyProps} />
    );

    // Esperem a que es carreguin les ressenyes (inicialment 0)
    await waitFor(() => expect(reviewsApi.getStationReviews).toHaveBeenCalled());

    // --- PAS 1: CREAR RESSENYA ---
    // Cliquem el botó flotant de "+" (Icona 'add')
    const addBtn = getByText('add');
    fireEvent.press(addBtn);

    // Omplim el formulari
    const input = getByPlaceholderText('stationSheet.commentPlaceholder');
    fireEvent.changeText(input, 'Aquesta estació està genial!');

    // Simulem posar 5 estrelles
    fireEvent.press(getByText('Donar 5 estrelles'));

    // Enviem el formulari ('common.publish' és la clau de traducció del botó publicar)
    fireEvent.press(getByText('common.publish'));

    // Esperem que la API d'afegir s'hagi cridat i la nova ressenya aparegui a la llista
    await waitFor(() => expect(reviewsApi.addStationReview).toHaveBeenCalled());
    expect(await findByText('Aquesta estació està genial!')).toBeTruthy();
    expect(getByText('e2e_user')).toBeTruthy();

    // --- PAS 2: EDITAR RESSENYA ---
    // Cliquem "Editar"
    fireEvent.press(getByText('common.edit'));

    // Canviem el text
    const editInput = getByPlaceholderText('stationSheet.commentPlaceholder');
    fireEvent.changeText(editInput, 'M\'he equivocat, està espatllada.');

    // Tornem a publicar ('common.publish' s'utilitza tant per crear com per editar al teu codi)
    fireEvent.press(getByText('common.publish'));

    // Validem que el text antic ja no hi és i surt el nou
    await waitFor(() => {
      expect(reviewsApi.updateStationReview).toHaveBeenCalled();
      expect(queryByText('Aquesta estació està genial!')).toBeNull();
      expect(getByText('M\'he equivocat, està espatllada.')).toBeTruthy();
    });

    // --- PAS 3: DONAR LIKE ---
    // La icona per defecte sense like és 'favorite-border'
    const likeBtn = getByText('favorite-border');
    fireEvent.press(likeBtn);

    await waitFor(() => {
      expect(reviewsApi.toggleReviewLike).toHaveBeenCalled();
    });

    // --- PAS 4: ESBORRAR RESSENYA ---
    let confirmDelete: (() => Promise<void>) | undefined;

    // Preparem el mock de l'Alerta nativa per capturar el botó d'eliminar
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      if (buttons && buttons[1] && buttons[1].onPress) {
        confirmDelete = buttons[1].onPress as () => Promise<void>;
      }
    });

    // Cliquem "Eliminar" ('common.delete')
    fireEvent.press(getByText('common.delete'));

    // Executem l'acció d'esborrar assegurant que React espera les promeses
    await act(async () => {
      if (confirmDelete) {
        await confirmDelete();
      }
    });

    // Ara sí, comprovem que s'ha cridat a l'API per esborrar
    await waitFor(() => {
      expect(reviewsApi.deleteStationReview).toHaveBeenCalled();
      // I que el text de la ressenya ha desaparegut definitivament
      expect(queryByText('M\'he equivocat, està espatllada.')).toBeNull();
    });

    alertSpy.mockRestore();
  });
});