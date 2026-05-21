
import { ThemedView } from '../../components/themed-view';
import React from 'react';
import { render } from '@testing-library/react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { describe, expect, test } from '@jest/globals';

// Mockeamos solo el hook, no el componente, para que el componente sea el REAL
jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(),
}));

describe('ThemedView', () => {
  test('renderiza correctamente y usa el color del tema', () => {
    // Simulamos que el hook devuelve un color específico
    (useThemeColor as jest.Mock).mockReturnValue('#123456');

    const { getByTestId } = render(
      <ThemedView testID="my-view" style={{ marginTop: 10 }} />
    );

    const view = getByTestId('my-view');
    
    // Verificamos que el componente aplicó el backgroundColor que devolvió el hook
    const styles = Array.isArray(view.props.style) 
      ? Object.assign({}, ...view.props.style) 
      : view.props.style;
      
    expect(styles.backgroundColor).toBe('#123456');
    expect(styles.marginTop).toBe(10);
  });
});