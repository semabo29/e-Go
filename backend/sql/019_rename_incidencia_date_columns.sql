-- Renombrar columnas de fecha de incidencia a snake_case (data_inici, etc.)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ego' AND table_name = 'incidencia' AND column_name = 'datainici'
  ) THEN
    ALTER TABLE ego.incidencia RENAME COLUMN datainici TO data_inici;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ego' AND table_name = 'incidencia' AND column_name = 'datavalidacio'
  ) THEN
    ALTER TABLE ego.incidencia RENAME COLUMN datavalidacio TO data_validacio;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ego' AND table_name = 'incidencia' AND column_name = 'dataresolucio'
  ) THEN
    ALTER TABLE ego.incidencia RENAME COLUMN dataresolucio TO data_resolucio;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ego' AND table_name = 'incidencia' AND column_name = 'datarebuig'
  ) THEN
    ALTER TABLE ego.incidencia RENAME COLUMN datarebuig TO data_rebuig;
  END IF;
END
$$;

DROP INDEX IF EXISTS ego.idx_incidencia_datainici;

CREATE INDEX IF NOT EXISTS idx_incidencia_data_inici
  ON ego.incidencia (data_inici);
