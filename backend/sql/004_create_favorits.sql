--Script para gestionar las estaciones de carga favoritas de los usuarios
--Como ejecutar: psql -U postgres -d nombre_de_tu_bd (postgres) -f 003_create_favorites.sql
-- psql -U postgres -d postgres -f .\backend\sql\003_create_favorits.sql desde el inicio.
--Aseguramos que trabajamos sobre el esquema ego y no el public
SET search_path TO ego, public;

CREATE TABLE IF NOT EXISTS favorits (
  usuari_id   INTEGER NOT NULL,
  estacio_id  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),

    primary key (usuari_id, estacio_id),
  --Ponemos las foreign keys para referenciar a usuarios y puntos de carga
  --Si se borra un usuario o una estación, se eliminan sus instancias de favoritos con el CASCADE
  CONSTRAINT fk_usuari
    FOREIGN KEY(usuari_id)
    REFERENCES Usuari(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_estacio
    FOREIGN KEY(estacio_id)
    REFERENCES estaciones(id)
    ON DELETE CASCADE
);