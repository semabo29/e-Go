-- Tabla de admins (backoffice)
-- Ajusta el schema y el nombre de tabla si tu DB usa otros valores.


CREATE SCHEMA IF NOT EXISTS ego;

CREATE TYPE IF NOT EXISTS ego.tipus_incidencia AS ENUM (
  'Avariat',
  'Operatiu',
  'Inexistent',
  'DadesIncorrectes',
  'Altres'
);

CREATE TABLE IF NOT EXISTS ego.incidencia (
  id         SERIAL PRIMARY KEY,
  tipus ego.tipus_incidencia NOT NULL,
  dataInici TIMESTAMPTZ NOT NULL,
  comentari VARCHAR(255) NOT NULL,
  arxiu VARCHAR(255) DEFAULT NULL,
  validada BOOLEAN NOT NULL DEFAULT FALSE,
  resolta BOOLEAN NOT NULL DEFAULT FALSE,
  conductor    INTEGER NOT NULL REFERENCES ego.conductor(user_id) ON DELETE CASCADE,
  estacio  INTEGER NOT NULL REFERENCES ego.estacio(id) ON DELETE CASCADE
);