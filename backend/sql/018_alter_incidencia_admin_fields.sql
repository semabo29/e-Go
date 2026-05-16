-- Ampliar tabla incidencia con campos de gestión admin (validación, rechazo, resolución)
-- y columna de control de puntos otorgados para evitar duplicados.

ALTER TABLE ego.incidencia
  ADD COLUMN IF NOT EXISTS rebutjada           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motiu_rebuig        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_validacio      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_resolucio      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_rebuig         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validada_by_admin   INTEGER REFERENCES ego.admins(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolta_by_admin    INTEGER REFERENCES ego.admins(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rebutjada_by_admin  INTEGER REFERENCES ego.admins(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS punts_atorgats      BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para consultas de pendientes por estación+tipo (usado en el trigger automático)
CREATE INDEX IF NOT EXISTS idx_incidencia_pending
  ON ego.incidencia (estacio, tipus)
  WHERE validada = FALSE AND rebutjada = FALSE AND resolta = FALSE;

-- Índice para el histórico filtrado por fechas
CREATE INDEX IF NOT EXISTS idx_incidencia_data_inici
  ON ego.incidencia (data_inici);
