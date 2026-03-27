//Test unitario para favoriteService.js
//Para ejecutarlo: npx jest favoriteService.test.js desde la carpeta backend o sus subcarpetas

//Importamos el archivo que vamos a testear
const favoriteService = require('../../services/favoriteService');
//Importamos el modelo real para poder "mockearlo" (simularlo)
const favoriteModel = require('../../models/favoriteModel');

//EL MOCK: Le decimos a Jest que intercepte cualquier llamada a favoriteModel,
//le dice a Jest que anule el comportamiento real del modelo, asi lo podemos simular sin tocar la BD real.
jest.mock('../../models/favoriteModel');

describe('Pruebas Unitarias - favoriteService', () => {
  //Limpieza (Antes de cada test, limpiamos el historial de llamadas del mock para asegurar
  //que un test no contamine al siguiente).
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /*
  Explicación funciones de testing:
    -expect(...): le dice a Jest que espero que a lo que ponga aquí le pase algo.
    -favoriteService.addFavorite(null, 15): Es la funcion de mi programa que quiero probar.
    -.rejects: Le dice a Jest que espero que esa promesa devuelva un error (las funciones asincronas devuelven promesas y luego estas fallas si no se cumplen).
    -.toThrow('Faltan IDs de usuario o estación'): Le dice que espero que el error te devuelva este mensaje.
  */


  //tests para addFavorite
  describe('Metodo: addFavorite', () => {
    test('1. Debe lanzar un error si falta el usuariId', async () => {
      //Usamos .rejects.toThrow porque la función es asíncrona (async) y lanza una excepción
      await expect(favoriteService.addFavorite(null, 15))
        .rejects.toThrow('Faltan IDs de usuario o estación');
    });

    test('2. Debe lanzar un error si falta el estacioId', async () => {
      await expect(favoriteService.addFavorite(5, null))
        .rejects.toThrow('Faltan IDs de usuario o estación');
    });

    test('3. Debe llamar al modelo correctamente si se le pasan los dos IDs', async () => {
      //Preparamos la respuesta simulada del modelo
      const respuestaSimulada = { success: true };
      favoriteModel.addFavorite.mockResolvedValue(respuestaSimulada);
      //Ejecutamos nuestro servicio
      const resultado = await favoriteService.addFavorite(5, 15);
      //Comprobamos que el servicio haya llamado al modelo con los parámetros exactos
      expect(favoriteModel.addFavorite).toHaveBeenCalledWith(5, 15);
      //Comprobamos que solo lo haya llamado 1 vez
      expect(favoriteModel.addFavorite).toHaveBeenCalledTimes(1);
      //Comprobamos que el servicio devuelve lo que le pasa el modelo
      expect(resultado).toEqual(respuestaSimulada);
    });
  });

  //tests para removeFavorite
  describe('Metodo: removeFavorite', () => {
    test('4. Debe lanzar un error si falta el usuariId', async () => {
      await expect(favoriteService.removeFavorite(null, 15))
        .rejects.toThrow('Faltan IDs de usuario o estación');
    });

    test('5. Debe lanzar un error si falta el estacioId', async () => {
      await expect(favoriteService.removeFavorite(5, null))
        .rejects.toThrow('Faltan IDs de usuario o estación');
    });

    test('6. Debe llamar al modelo correctamente si se le pasan los dos IDs', async () => {
      favoriteModel.removeFavorite.mockResolvedValue({ deleted: true });

      const resultado = await favoriteService.removeFavorite(5, 15);

      expect(favoriteModel.removeFavorite).toHaveBeenCalledWith(5, 15);
      expect(favoriteModel.removeFavorite).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual({ deleted: true });
    });
  });

  //tests para getUserFavorites
  describe('Metodo: getUserFavorites', () => {
    test('7. Debe lanzar un error si falta el usuariId', async () => {
      await expect(favoriteService.getUserFavorites(null))
        .rejects.toThrow('ID de usuario no proporcionado');
    });

    test('8. Debe llamar al modelo y devolver el array de favoritos del usuario', async () => {
      //Simulamos que el modelo nos devuelve una lista con 2 estaciones favoritas
      const favoritosSimulados = [{ estacio_id: 10 }, { estacio_id: 20 }];
      favoriteModel.getFavoritesByUser.mockResolvedValue(favoritosSimulados);

      const resultado = await favoriteService.getUserFavorites(5);

      expect(favoriteModel.getFavoritesByUser).toHaveBeenCalledWith(5);
      expect(favoriteModel.getFavoritesByUser).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(favoritosSimulados);
    });
  });
});