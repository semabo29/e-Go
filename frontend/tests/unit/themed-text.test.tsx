import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#111111'),
}));

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

describe('ThemedText', () => {
  test('renderiza texto con color del tema', () => {
    const { getByText } = render(<ThemedText>Hola</ThemedText>);
    const node = getByText('Hola');
    expect(node.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#111111' })])
    );
  });

  test('pasa light/dark a useThemeColor', () => {
    render(<ThemedText lightColor="#aaa" darkColor="#bbb">T</ThemedText>);
    expect(useThemeColor).toHaveBeenCalledWith(
      { light: '#aaa', dark: '#bbb' },
      'text'
    );
  });

  test.each(['default', 'title', 'defaultSemiBold', 'subtitle', 'link'] as const)(
    'aplica estilo type=%s',
    (type) => {
      const { getByText } = render(<ThemedText type={type}>Tipo</ThemedText>);
      expect(getByText('Tipo')).toBeTruthy();
    }
  );

  test('acepta style adicional', () => {
    const { getByText } = render(
      <ThemedText style={{ marginTop: 8 }}>Con margen</ThemedText>
    );
    const styles = getByText('Con margen').props.style;
    expect(styles).toEqual(expect.arrayContaining([{ marginTop: 8 }]));
  });
});
