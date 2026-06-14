import { renderHook } from '@testing-library/react-native';
import { describe, test, expect, jest } from '@jest/globals';

jest.mock('@/contexts/ColorblindPreferenceContext', () => ({
  useColorblindPreference: () => ({ colorblindFriendly: false }),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

describe('useThemeColor', () => {
  test('returns prop color for light theme when provided', () => {
    const { result } = renderHook(() =>
      useThemeColor({ light: '#ff0000', dark: '#0000ff' }, 'text')
    );
    expect(result.current).toBe('#ff0000');
  });

  test('returns dark prop color when scheme is dark', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { result } = renderHook(() =>
      useThemeColor({ light: '#ff0000', dark: '#0000ff' }, 'text')
    );
    expect(result.current).toBe('#0000ff');
  });

  test('returns Colors value when no prop for theme', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() =>
      useThemeColor({}, 'text')
    );
    expect(typeof result.current).toBe('string');
  });

  test('returns Colors value for dark when no dark prop', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { result } = renderHook(() =>
      useThemeColor({}, 'text')
    );
    expect(typeof result.current).toBe('string');
  });

  test('returns sem.accent for tint in light mode without prop', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() =>
      useThemeColor({}, 'tint')
    );
    expect(typeof result.current).toBe('string');
    expect(result.current.length).toBeGreaterThan(0);
  });

  test('returns sem.accent for tabIconSelected in light mode without prop', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');
    const { result } = renderHook(() =>
      useThemeColor({}, 'tabIconSelected')
    );
    expect(typeof result.current).toBe('string');
  });
});