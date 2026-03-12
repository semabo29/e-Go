-- Tabla para los puntos de carga (estaciones) de la Generalitat
CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS estaciones (
  id                     SERIAL PRIMARY KEY,
  external_id            VARCHAR(100) UNIQUE, -- El ":id" de la API (ej: "row-ktat-bcq8.qbut")
  promotor               VARCHAR(255),
  acces                  VARCHAR(100),
  tipus_velocitat        VARCHAR(100),
  tipus_connexio         VARCHAR(100),
  latitud                DECIMAL(12, 9),
  longitud               DECIMAL(12, 9),
  nom                    VARCHAR(255), -- "designaci_descriptiva"
  kw                     DECIMAL(10, 2),
  ac_dc                  VARCHAR(20),
  adreca                 TEXT,         -- "adre_a"
  municipi               VARCHAR(100),
  provincia              VARCHAR(100),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at (opcional, reutilizando el del login si existe)
DROP TRIGGER IF EXISTS estaciones_updated_at ON estaciones;
CREATE TRIGGER estaciones_updated_at
  BEFORE UPDATE ON estaciones
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
