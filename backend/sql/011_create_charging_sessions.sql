-- Script para crear la tabla de sesiones de carga
-- Esta tabla registra cada sesión de carga de un usuario en una estación específica
-- Como ejecutar: psql -U postgres -d nombre_de_tu_bd -f 011_create_charging_sessions.sql

CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.charging_sessions (
  id SERIAL PRIMARY KEY,
  usuari_id INTEGER NOT NULL,
  estacio_id INTEGER NOT NULL,
  inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin TIMESTAMPTZ,
  duracion_minutos INTEGER,
  puntos_totales INTEGER,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  razon_finalizacion VARCHAR(50), -- 'manual', 'distance_exceeded', 'signal_loss'
  multiplicador_premium DECIMAL(2, 1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_usuari
    FOREIGN KEY(usuari_id)
    REFERENCES ego.usuari(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_estacio
    FOREIGN KEY(estacio_id)
    REFERENCES ego.estaciones(id)
    ON DELETE CASCADE
);

-- Índices para mejorar queries frecuentes
CREATE INDEX IF NOT EXISTS idx_charging_sessions_usuari_id ON ego.charging_sessions(usuari_id);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_estacio_id ON ego.charging_sessions(estacio_id);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_status ON ego.charging_sessions(status);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_usuari_status ON ego.charging_sessions(usuari_id, status);

-- Trigger para actualizar el timestamp de actualización automáticamente
CREATE OR REPLACE FUNCTION update_charging_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_charging_sessions_updated_at
  BEFORE UPDATE ON ego.charging_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_charging_sessions_updated_at();

