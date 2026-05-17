import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TouchableOpacity } from 'react-native';

import PerfilScreen from '@/app/user';
import { useAuth } from '@/contexts/AuthContext';
import { useColorblindPreference } from '@/contexts/ColorblindPreferenceContext';

const mockBack = jest.fn();
const mockPush = jest.fn();

let mockParams: any = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  Stack: {
    Screen: ({ options }: any) => null,
  },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: jest.fn(),
}));

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

describe('PerfilScreen (user.tsx) integration', () => {
  const mockUser = {
    id: 1,
    email: 'user@test.com',
    username: 'TestUser',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: jest.fn(),
      logout: jest.fn(),
      isLoading: false,
    });

    (useColorblindPreference as jest.Mock).mockReturnValue({
      colorblindFriendly: false,
    });

    mockParams = { userId: 1 };

    // Mock fetch para las llamadas a la API
    globalThis.fetch = jest.fn(async (url: string, options?: RequestInit) => {
      // GET /user - cargar perfil
      if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
        return {
          ok: true,
          json: async () => ({
            id: 1,
            username: 'TestUser',
            email: 'user@test.com',
            punts: 250,
            created_at: '2024-01-01T00:00:00Z',
            premium: false,
            admin: false,
            empresa: false,
          }),
        } as any;
      }

      // GET /friends - cargar lista de amigos
      if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
        return {
          ok: true,
          json: async () => [],
        } as any;
      }

      // PUT /user - guardar perfil
      if (url.includes('/user?usuari_id=1') && options?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({
            id: 1,
            username: 'UpdatedUser',
            email: 'user@test.com',
          }),
        } as any;
      }

      // POST /friends - enviar solicitud de amistad
      if (url.includes('/friends') && options?.method === 'POST') {
        return { ok: true, status: 201 } as any;
      }

      // PUT /friends - aceptar solicitud de amistad
      if (url.includes('/friends') && options?.method === 'PUT') {
        return { ok: true } as any;
      }

      // DELETE /friends - rechazar/cancelar/eliminar amistad
      if (url.includes('/friends') && options?.method === 'DELETE') {
        return { ok: true } as any;
      }

      return { ok: false, status: 404 } as any;
    }) as unknown as typeof fetch;
  });

  // Prueba que se carga el perfil correctamente
  it('carga y renderiza el perfil del usuario correctamente', async () => {
    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
      expect(getByText('user@test.com')).toBeTruthy();
      expect(getByText('250')).toBeTruthy();
    });
  });

  // Prueba que muestra el estado de carga inicial
  it('muestra el estado de carga inicialmente', () => {
    // Simulamos un fetch que se queda "pensando"
    (globalThis.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByText } = render(<PerfilScreen />);

    expect(getByText('Cargando perfil...')).toBeTruthy();
  });

  // Prueba que permite editar el nombre de usuario
  it('permite editar el username y guardar cambios', async () => {
    const mockSetUser = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      logout: jest.fn(),
      isLoading: false,
    });

    const { getByText, getByPlaceholderText, UNSAFE_getByType } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Clicamos en "Modificar perfil"
    fireEvent.press(getByText('Modificar perfil'));

    // Comprobamos que el input aparece
    await waitFor(() => {
      expect(getByPlaceholderText('Nombre de usuario')).toBeTruthy();
    });

    // Limpiamos el campo y escribimos un nuevo nombre
    const input = getByPlaceholderText('Nombre de usuario');
    fireEvent.changeText(input, 'UpdatedUser');

    // Clicamos en "Guardar cambios"
    fireEvent.press(getByText('Guardar cambios'));

    // Comprobamos que se realiza la llamada PUT
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user?usuari_id=1'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // Comprobamos que setUser se llama con el nuevo nombre
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'UpdatedUser',
        })
      );
    });
  });

  // Prueba que cancela la edición correctamente
  it('cancela la edición sin guardar cambios', async () => {
    const { getByText, getByPlaceholderText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Clicamos en "Modificar perfil"
    fireEvent.press(getByText('Modificar perfil'));

    // Esperamos a que aparezca el input
    await waitFor(() => {
      expect(getByPlaceholderText('Nombre de usuario')).toBeTruthy();
    });

    // Modificamos el nombre
    const input = getByPlaceholderText('Nombre de usuario');
    fireEvent.changeText(input, 'NewName');

    // Clicamos en "Cancelar"
    fireEvent.press(getByText('Cancelar'));

    // Comprobamos que vuelve a mostrar el nombre original
    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Comprobamos que no se llamó a PUT
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/user?usuari_id=1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  // Prueba que permite enviar una solicitud de amistad
  it('envía solicitud de amistad cuando esAmic === 0', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        if (url.includes('/friends') && options?.method === 'POST') {
          return { ok: true, status: 201 };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('OtherUser')).toBeTruthy();
    });

    // Clicamos en "Enviar solicitud"
    fireEvent.press(getByText('Enviar solicitud'));

    // Comprobamos que se realiza la llamada POST
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=1&usuari_id2=2'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  // Prueba que aceptar una solicitud de amistad
  it('acepta una solicitud de amistad pendiente', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        // Retorna que hay solicitud pendiente: per_acceptar === 1 (pendiente del usuario logueado)
        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 1, // Solicitud pendiente para el usuario logueado
              },
            ],
          };
        }

        if (url.includes('/friends') && options?.method === 'PUT') {
          return { ok: true };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Tienes una solicitud de amistad de este usuario')).toBeTruthy();
    });

    // Clicamos en "Aceptar"
    fireEvent.press(getByText('Aceptar'));

    // Comprobamos que se realiza la llamada PUT
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=1&usuari_id2=2'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  // Prueba que rechazar una solicitud de amistad
  it('rechaza una solicitud de amistad pendiente', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 1,
              },
            ],
          };
        }

        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: true };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Rechazar')).toBeTruthy();
    });

    // Clicamos en "Rechazar"
    fireEvent.press(getByText('Rechazar'));

    // Comprobamos que se realiza la llamada DELETE
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=1&usuari_id2=2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // Prueba que elimina un amigo
  it('elimina un amigo cuando esAmic === 3', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        // Retorna que son amigos: per_acceptar === null (amigos aceptados)
        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: null,
              },
            ],
          };
        }

        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: true };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('✓ Amigo')).toBeTruthy();
    });

    // Buscamos el botón de eliminar amigo (que contiene el icono person-remove)
    const deleteButton = getByText('person-remove').parent?.parent;
    fireEvent.press(deleteButton);

    // Comprobamos que se realiza la llamada DELETE
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=1&usuari_id2=2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // Prueba que cancela solicitud de amistad enviada
  it('cancela una solicitud de amistad enviada (esAmic === 2)', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        // Retorna que hay solicitud pendiente enviada: per_acceptar === 2 (pendiente del otro usuario)
        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 2,
              },
            ],
          };
        }

        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: true };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Solicitud enviada')).toBeTruthy();
    });

    // Buscamos el botón de cancelar
    const closeIcon = getByText('close').parent;
    fireEvent.press(closeIcon);

    // Comprobamos que se realiza la llamada DELETE
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/friends?usuari_id1=1&usuari_id2=2'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // Prueba que muestra información del perfil con badges
  it('muestra badges de empresa y admin cuando corresponde', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'AdminUser',
              email: 'admin@test.com',
              punts: 500,
              created_at: '2024-01-01T00:00:00Z',
              premium: true,
              admin: true,
              empresa: true,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Empresa')).toBeTruthy();
      expect(getByText('Admin')).toBeTruthy();
    });
  });

  // Prueba que muestra mensaje cuando no existe el usuario
  it('muestra mensaje cuando el usuario no existe', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=999') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => null,
          };
        }

        if (url.includes('/friends?usuari_id=999') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        return { ok: false, status: 404 };
      }
    );

    mockParams = { userId: 999 };

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('No existe el usuario')).toBeTruthy();
    });
  });

  // Prueba que el botón atrás funciona
  it('navega hacia atrás al presionar el botón atrás', async () => {
    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    // Buscamos y clicamos el botón de atrás
    const backIcon = getByText('arrow-back').parent;
    fireEvent.press(backIcon);

    expect(mockBack).toHaveBeenCalled();
  });

  // Prueba renderización de puntos
  it('renderiza correctamente los puntos del usuario', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'TestUser',
              email: 'user@test.com',
              punts: 999,
              created_at: '2024-01-01T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('999')).toBeTruthy();
      expect(getByText('Puntos')).toBeTruthy();
    });
  });

  // Prueba que renderiza el nombre con colores rainbow para usuarios premium
  it('renderiza nombre con colores rainbow para usuarios premium', async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'User12345',
              email: 'premium@test.com',
              punts: 500,
              created_at: '2024-01-01T00:00:00Z',
              premium: true,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('U')).toBeTruthy();
      expect(getByText('s')).toBeTruthy();
      expect(getByText('e')).toBeTruthy();
      expect(getByText('r')).toBeTruthy();
      expect(getByText('1')).toBeTruthy();
      expect(getByText('2')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
      expect(getByText('4')).toBeTruthy();
    });
  });

  // Prueba error al eliminar amigo
  it('maneja error cuando falla al eliminar amigo', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: null,
              },
            ],
          };
        }

        // Simular error en DELETE
        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: false, status: 500 };
        }

        return { ok: false, status: 404 };
      }
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('✓ Amigo')).toBeTruthy();
    });

    // Intenta eliminar amigo
    const deleteButton = getByText('person-remove').parent?.parent;
    fireEvent.press(deleteButton);

    // Comprobamos que se registra el error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error eliminando amigo:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  // Prueba error al aceptar solicitud de amistad
  it('maneja error cuando falla al aceptar solicitud', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 1,
              },
            ],
          };
        }

        // Simular error en PUT
        if (url.includes('/friends') && options?.method === 'PUT') {
          return { ok: false, status: 500 };
        }

        return { ok: false, status: 404 };
      }
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Aceptar')).toBeTruthy();
    });

    fireEvent.press(getByText('Aceptar'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error aceptando solicitud:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  // Prueba error al rechazar solicitud de amistad
  it('maneja error cuando falla al rechazar solicitud', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 1,
              },
            ],
          };
        }

        // Simular error en DELETE
        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: false, status: 500 };
        }

        return { ok: false, status: 404 };
      }
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Rechazar')).toBeTruthy();
    });

    fireEvent.press(getByText('Rechazar'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error rechazando solicitud:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  // Prueba error al cancelar solicitud de amistad
  it('maneja error cuando falla al cancelar solicitud', async () => {
    mockParams = { userId: 2 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 2,
              },
            ],
          };
        }

        // Simular error en DELETE
        if (url.includes('/friends') && options?.method === 'DELETE') {
          return { ok: false, status: 500 };
        }

        return { ok: false, status: 404 };
      }
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Solicitud enviada')).toBeTruthy();
    });

    const closeIcon = getByText('close').parent;
    fireEvent.press(closeIcon);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error cancelando solicitud:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  // Prueba error al guardar perfil
  it('maneja error cuando falla al guardar perfil', async () => {
    const mockSetUser = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
      logout: jest.fn(),
      isLoading: false,
    });

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'TestUser',
              email: 'user@test.com',
              punts: 250,
              created_at: '2024-01-01T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return { ok: true, json: async () => [] };
        }

        // Simular error en PUT
        if (url.includes('/user?usuari_id=1') && options?.method === 'PUT') {
          return {
            ok: false,
            json: async () => ({ error: 'Username already exists' }),
          };
        }

        return { ok: false, status: 404 };
      }
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('TestUser')).toBeTruthy();
    });

    fireEvent.press(getByText('Modificar perfil'));

    await waitFor(() => {
      expect(getByPlaceholderText('Nombre de usuario')).toBeTruthy();
    });

    const input = getByPlaceholderText('Nombre de usuario');
    fireEvent.changeText(input, 'NewName');

    fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error guardando perfil:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  // Prueba que llama fetchAmics después de aceptar solicitud
  it('actualiza lista de amigos después de aceptar solicitud', async () => {
    mockParams = { userId: 2 };

    const fetchCallOrder: string[] = [];

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=2') && (!options || options.method === undefined)) {
          fetchCallOrder.push('user');
          return {
            ok: true,
            json: async () => ({
              id: 2,
              username: 'OtherUser',
              email: 'other@test.com',
              punts: 100,
              created_at: '2024-01-02T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=2') && (!options || options.method === undefined)) {
          fetchCallOrder.push('friends');
          return {
            ok: true,
            json: async () => [
              {
                id: 1,
                username: 'TestUser',
                per_acceptar: 1,
              },
            ],
          };
        }

        if (url.includes('/friends') && options?.method === 'PUT') {
          fetchCallOrder.push('accept');
          return { ok: true };
        }

        return { ok: false, status: 404 };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Aceptar')).toBeTruthy();
    });

    // Limpiar el array de llamadas previas
    fetchCallOrder.length = 0;

    fireEvent.press(getByText('Aceptar'));

    await waitFor(() => {
      expect(fetchCallOrder).toContain('accept');
      expect(fetchCallOrder).toContain('friends');
    });
  });

  // Prueba renderización de solicitudes recibidas
  it('renderiza correctamente las solicitudes de amistad recibidas', async () => {
    mockParams = { userId: 1 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'TestUser',
              email: 'user@test.com',
              punts: 250,
              created_at: '2024-01-01T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 5,
                username: 'FriendA',
                per_acceptar: 1, // Pendiente de aceptar por el usuario logueado
              },
              {
                id: 6,
                username: 'FriendB',
                per_acceptar: 1,
              },
            ],
          };
        }

        return { ok: true };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Solicitudes recibidas (2)')).toBeTruthy();
      expect(getByText('FriendA')).toBeTruthy();
      expect(getByText('FriendB')).toBeTruthy();
    });
  });

  // Prueba renderización de solicitudes enviadas
  it('renderiza correctamente las solicitudes de amistad enviadas', async () => {
    mockParams = { userId: 1 };

    (globalThis.fetch as jest.Mock).mockImplementation(
      async (...args: unknown[]) => {
        const [url, options] = args as [string, RequestInit | undefined];

        if (url.includes('/user?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => ({
              id: 1,
              username: 'TestUser',
              email: 'user@test.com',
              punts: 250,
              created_at: '2024-01-01T00:00:00Z',
              premium: false,
              admin: false,
              empresa: false,
            }),
          };
        }

        if (url.includes('/friends?usuari_id=1') && (!options || options.method === undefined)) {
          return {
            ok: true,
            json: async () => [
              {
                id: 7,
                username: 'UserX',
                per_acceptar: 7, // Pendiente de aceptar por el otro usuario
              },
              {
                id: 8,
                username: 'UserY',
                per_acceptar: 8,
              },
            ],
          };
        }

        return { ok: true };
      }
    );

    const { getByText } = render(<PerfilScreen />);

    await waitFor(() => {
      expect(getByText('Solicitudes enviadas (2)')).toBeTruthy();
      expect(getByText('UserX')).toBeTruthy();
      expect(getByText('UserY')).toBeTruthy();
    });
  });
});
