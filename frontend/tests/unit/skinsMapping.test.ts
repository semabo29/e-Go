import { getSkinImage } from '@/utils/skinsMapping';
import { describe, expect, test } from '@jest/globals';

describe('Skins Mapping Utility', () => {
  test('devuelve la imagen por defecto si la skin no existe o es nula', () => {
    const defaultImage = getSkinImage('cotxe_basic');
    const unknownImage = getSkinImage('skin_inventada_123');
    const nullImage = getSkinImage(null as any);

    // Todas deberían devolver la misma imagen por defecto (cotxe_basic)
    expect(unknownImage).toBe(defaultImage);
    expect(nullImage).toBe(defaultImage);
  });

  test('devuelve las imágenes correctas para las skins conocidas', () => {
    const otraSkin = getSkinImage('camio_blau'); 
    const cocheBasic = getSkinImage('cotxe_basic');

    expect(otraSkin).not.toBeUndefined();
    // Si la otra skin existe de verdad, no debería ser igual al coche básico
    expect(otraSkin).not.toBe(cocheBasic); 
  });
});