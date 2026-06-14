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

  // si no hay reseñas se muestra un mensaje de que aún no hay valoraciones y no se muestra la media
  test('TC8: sin reseñas muestra texto de lista vacía y no muestra media', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [],
    })) as unknown as typeof fetch;

    const { getByText, queryByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Aún no hay valoraciones. ¡Sé el primero!')).toBeTruthy();
      expect(queryByText('4.0')).toBeNull();
    });
  });

  // si falla la carga de reseñas no se rompe el panel
  test('TC9: fallo al cargar reseñas no rompe el panel', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = jest.fn(async () => {
      throw new Error('red');
    }) as unknown as typeof fetch;

    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Valoraciones')).toBeTruthy();
    });
    errorSpy.mockRestore();
  });

  // si falla la publicación de una reseña se muestra un mensaje de error
  test('TC10: error al publicar muestra alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/reviews') && (!options || options.method === 'GET')) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (options?.method === 'POST') {
        return { ok: false, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { getByText, getAllByText, getByPlaceholderText } = render(
      <StationBottomSheet {...defaultProps} />
    );

    await waitFor(() => expect(getByText('add')).toBeTruthy());
    fireEvent.press(getByText('add'));
    fireEvent.press(getAllByText('star-border')[4]);
    fireEvent.changeText(getByPlaceholderText('Escribe tu comentario...'), 'Fallo');
    fireEvent.press(getByText('Publicar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Ha habido un problema guardando la valoración.');
    });
    alertSpy.mockRestore();
  });

  // si falla la eliminación de una reseña se muestra un mensaje de error
  test('TC11: error al eliminar muestra alert', async () => {
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/reviews') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => [{ id: 50, puntuacio: 4, usuari_id: 1, username: 'Tester', likes_count: 0 }],
        } as Response;
      }
      if (options?.method === 'DELETE') {
        return { ok: false, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('Eliminar')).toBeTruthy());
    fireEvent.press(getByText('Eliminar'));
    const deleteBtn = alertSpy.mock.calls[0][2]?.find((b) => b.text === 'Eliminar');
    await act(async () => {
      if (deleteBtn?.onPress) await deleteBtn.onPress();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'No se ha podido eliminar.');
    });
    alertSpy.mockRestore();
  });

  // si no hay usuario logueado se muestra un mensaje de que debe iniciar sesión para valorar
  test('TC12: like sin usuario muestra alert de inicio de sesión', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('favorite-border')).toBeTruthy());
    const fetchMock = jest.mocked(globalThis.fetch);
    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.press(getByText('favorite-border'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Inicia sesión',
      'Debes iniciar sesión para valorar los comentarios.'
    );
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    alertSpy.mockRestore();
  });

  // quitar like (user_has_liked true) decrementa likes_count
  test('TC13b: quitar like decrementa el contador optimista', async () => {
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/reviews') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              puntuacio: 4,
              comentari: 'Ok',
              data_publicacio: '2026-01-01',
              data_actualitzacio: '2026-01-01',
              usuari_id: 2,
              username: 'Otro',
              likes_count: 6,
              user_has_liked: true,
            },
          ],
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('6')).toBeTruthy();
      expect(getByText('favorite')).toBeTruthy();
    });

    fireEvent.press(getByText('favorite'));

    await waitFor(() => {
      expect(getByText('5')).toBeTruthy();
      expect(getByText('favorite-border')).toBeTruthy();
    });
  });

  //los likes de las reseñas no se afectan entre sí
  test('TC13c: like en una reseña deja intacta la otra', async () => {
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/reviews') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              puntuacio: 5,
              comentari: 'A',
              data_publicacio: '2026-01-01',
              data_actualitzacio: '2026-01-01',
              usuari_id: 2,
              username: 'UserA',
              likes_count: 2,
              user_has_liked: false,
            },
            {
              id: 2,
              puntuacio: 3,
              comentari: 'B',
              data_publicacio: '2026-01-02',
              data_actualitzacio: '2026-01-02',
              usuari_id: 3,
              username: 'UserB',
              likes_count: 10,
              user_has_liked: false,
            },
          ],
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { getByText, getAllByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('UserA')).toBeTruthy();
      expect(getByText('UserB')).toBeTruthy();
    });

    const likeButtons = getAllByText('favorite-border');
    fireEvent.press(likeButtons[1]);

    await waitFor(() => {
      expect(getByText('11')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
    });
  });

  // si la reseña no tiene comentario no se muestra el texto de la opinión
  test('TC13d: reseña sin comentario no muestra texto de opinión', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: 8,
          puntuacio: 4,
          comentari: '',
          data_publicacio: '2026-01-01',
          data_actualitzacio: '2026-01-01',
          usuari_id: 2,
          username: 'SinTexto',
          likes_count: 0,
          user_has_liked: false,
        },
      ],
    })) as unknown as typeof fetch;

    const { getByText, queryByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('SinTexto')).toBeTruthy());
    expect(queryByText('Molt bon lloc!')).toBeNull();
  });

  // si falla el like se revierte el contador de likes
  test('TC13: fallo en like revierte el contador de likes', async () => {
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('/like') && options?.method === 'POST') {
        throw new Error('network');
      }
      if (url.includes('/reviews')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              puntuacio: 4,
              comentari: 'Ok',
              data_publicacio: '2026-01-01',
              data_actualitzacio: '2026-01-01',
              usuari_id: 2,
              username: 'Otro',
              likes_count: 5,
              user_has_liked: false,
            },
          ],
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as unknown as typeof fetch;

    const { getByText, queryByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText('5')).toBeTruthy());
    fireEvent.press(getByText('favorite-border'));

    await waitFor(() => {
      expect(getByText('5')).toBeTruthy();
      expect(queryByText('6')).toBeNull();
    });
  });

  // al pulsar el botón de cancelar se limpia el formulario y se ocultan los campos
  test('TC14: cancelar formulario oculta el form y limpia campos', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <StationBottomSheet {...defaultProps} />
    );

    await waitFor(() => expect(getByText('add')).toBeTruthy());
    fireEvent.press(getByText('add'));
    fireEvent.changeText(getByPlaceholderText('Escribe tu comentario...'), 'Borrar esto');
    fireEvent.press(getByText('Cancelar'));

    await waitFor(() => {
      expect(queryByPlaceholderText('Escribe tu comentario...')).toBeNull();
    });
  });

  // si se edita una reseña se muestra el indicador (Editado) en la fecha
  test('TC15: reseña editada muestra indicador (Editado) en la fecha', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: 3,
          puntuacio: 5,
          comentari: 'Actualizada',
          data_publicacio: '2026-01-01T10:00:00.000Z',
          data_actualitzacio: '2026-02-01T12:00:00.000Z',
          usuari_id: 2,
          username: 'User',
          likes_count: 0,
          user_has_liked: false,
        },
      ],
    })) as unknown as typeof fetch;

    const { getByText } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() => expect(getByText(/\(Editado\)/)).toBeTruthy());
  });

  // al cambiar de estación se vuelve a pedir la lista de reseñas
  test('TC16: cambiar estación recarga reseñas con nuevo id', async () => {
    const fetchMock = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => [],
    })) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const stationB = { ...mockStation, id: 77 };
    const { rerender } = render(<StationBottomSheet {...defaultProps} />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stations/10/reviews'))
    );

    rerender(<StationBottomSheet {...defaultProps} station={stationB} />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/stations/77/reviews'))
    );
  });
});