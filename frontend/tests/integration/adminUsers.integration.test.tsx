import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockReplace = jest.fn();
const mockGetPrivilegedToken = jest.fn();
const mockPrivilegedFetch = jest.fn();
const mockListAdminUsers = jest.fn();
const mockSetUserBanStatus = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/services/privilegedAuth', () => ({
  getPrivilegedToken: (...args: any[]) => mockGetPrivilegedToken(...args),
  privilegedFetch: (...args: any[]) => mockPrivilegedFetch(...args),
}));

jest.mock('@/services/adminUserModeration', () => ({
  listAdminUsers: (...args: any[]) => mockListAdminUsers(...args),
  setUserBanStatus: (...args: any[]) => mockSetUserBanStatus(...args),
}));

import AdminUsersScreen from '@/app/admin-users';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@test.com',
  is_banned: false,
  banned_reason: null,
};

const mockBannedUser = {
  id: 2,
  username: 'banneduser',
  email: 'banned@test.com',
  is_banned: true,
  banned_reason: 'Spam',
};

const mockAdminMe = { ok: true, json: async () => ({ admin: { sub: 1, email: 'admin@test.com', role: 'admin' } }) };

describe('AdminUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state initially', () => {
    mockGetPrivilegedToken.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<AdminUsersScreen />);
    expect(getByText(/Cargando/)).toBeTruthy();
  });

  test('shows error when no admin token', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText } = render(<AdminUsersScreen />);
    await findByText('No hay sesion admin');
  });

  test('shows error when privilegedFetch returns unauthorized', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No autorizado' }),
    });
    const { findByText } = render(<AdminUsersScreen />);
    await findByText('No autorizado');
  });

  test('shows users list after successful load', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    const { findByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    expect(true).toBeTruthy();
  });

  test('shows user email and status', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    const { findByText, getByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    expect(getByText('test@test.com')).toBeTruthy();
    expect(getByText('Activo')).toBeTruthy();
  });

  test('shows banned user status and reason', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockBannedUser]);
    const { findByText, getByText } = render(<AdminUsersScreen />);
    await findByText('banneduser');
    expect(getByText('Baneado')).toBeTruthy();
    expect(getByText(/Spam/)).toBeTruthy();
  });

  test('shows empty message when no users', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([]);
    const { findByText } = render(<AdminUsersScreen />);
    await findByText(/No hay usuarios/);
  });

  test('search filters users by username', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser, mockBannedUser]);
    const { findByText, getByText, getByPlaceholderText, queryByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    fireEvent.changeText(getByPlaceholderText(/Nombre, email/), 'testuser');
    await waitFor(() => {
      expect(getByText('testuser')).toBeTruthy();
      expect(queryByText('banneduser')).toBeNull();
    });
  });

  test('search shows no results message when no match', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    const { findByText, getByText, getByPlaceholderText, queryByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    fireEvent.changeText(getByPlaceholderText(/Nombre, email/), 'zzznomatch');
    await waitFor(() => {
      expect(getByText(/Ningun usuario/)).toBeTruthy();
    });
  });

  test('ban button opens modal for active user', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    const { findByText, getAllByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    const banBtns = getAllByText('Banear');
    fireEvent.press(banBtns[0]);
    await waitFor(() => {
      expect(getAllByText('Banear').length).toBeGreaterThan(1);
    });
  });

  test('ban modal can be cancelled', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    const { findByText, getAllByText, getByText, queryByText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    fireEvent.press(getAllByText('Banear')[0]);
    await waitFor(() => expect(getAllByText('Banear').length).toBeGreaterThan(1));
    fireEvent.press(getByText('Cancelar'));
    await waitFor(() => {
      expect(getAllByText('Banear').length).toBe(1);
    });
  });

  test('confirms ban calls setUserBanStatus', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn() as any);
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockUser]);
    mockSetUserBanStatus.mockResolvedValue({ ...mockUser, is_banned: true });
    const { findByText, getAllByText, getByPlaceholderText } = render(<AdminUsersScreen />);
    await findByText('testuser');
    fireEvent.press(getAllByText('Banear')[0]);
    await waitFor(() => expect(getAllByText('Banear').length).toBeGreaterThan(1));
    fireEvent.changeText(getByPlaceholderText(/Incumplimiento/), 'Incumple normas');
    const banBtns = getAllByText('Banear');
    fireEvent.press(banBtns[banBtns.length - 1]);
    await waitFor(() => {
      expect(mockSetUserBanStatus).toHaveBeenCalledWith(1, true, 'Incumple normas');
    });
  });

  test('unban button calls setUserBanStatus with false', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([mockBannedUser]);
    mockSetUserBanStatus.mockResolvedValue({ ...mockBannedUser, is_banned: false });
    const { findByText, getAllByText } = render(<AdminUsersScreen />);
    await findByText('banneduser');
    const desbanBtns = getAllByText('Desbanear');
    fireEvent.press(desbanBtns[0]);
    await waitFor(() => expect(getAllByText('Desbanear').length).toBeGreaterThan(1));
    const allDesban = getAllByText('Desbanear');
    fireEvent.press(allDesban[allDesban.length - 1]);
    await waitFor(() => {
      expect(mockSetUserBanStatus).toHaveBeenCalledWith(2, false, undefined);
    });
  });

  test('back button navigates to admin-home', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockResolvedValue(mockAdminMe);
    mockListAdminUsers.mockResolvedValue([]);
    const { findByText, getByText } = render(<AdminUsersScreen />);
    await findByText(/No hay usuarios/);
    fireEvent.press(getByText('Volver al panel admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-home');
  });

  test('error login button navigates to admin-login', async () => {
    mockGetPrivilegedToken.mockResolvedValue(null);
    const { findByText, getByText } = render(<AdminUsersScreen />);
    await findByText('No hay sesion admin');
    fireEvent.press(getByText('Ir al login admin'));
    expect(mockReplace).toHaveBeenCalledWith('/admin-login');
  });

  test('network error shows error message', async () => {
    mockGetPrivilegedToken.mockResolvedValue('token123');
    mockPrivilegedFetch.mockRejectedValue(new Error('timeout'));
    const { findByText } = render(<AdminUsersScreen />);
    await findByText(/servidor/);
  });
});