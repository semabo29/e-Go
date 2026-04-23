-- Tabla de admins (backoffice)
-- Ajusta el schema y el nombre de tabla si tu DB usa otros valores.

CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.conductor (
  user_id    INTEGER PRIMARY KEY UNIQUE REFERENCES ego.usuari(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dataIniPremium TIMESTAMPTZ DEFAULT NULL,
  dataFiPremium TIMESTAMPTZ DEFAULT NULL,
  renovarSub BOOLEAN NOT NULL DEFAULT FALSE,
  Baneado BOOLEAN NOT NULL DEFAULT FALSE,
  punts INTEGER NOT NULL DEFAULT 0
);