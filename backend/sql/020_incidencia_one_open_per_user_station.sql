-- Màxim 1 incidència oberta amb tipus = Operatiu i 1 amb tipus <> Operatiu
-- per conductor i estació (tancada = resolta o rebutjada).

DROP INDEX IF EXISTS ego.idx_incidencia_one_open_per_user_station;
DROP INDEX IF EXISTS ego.idx_incidencia_one_open_problema_per_user_station;
DROP INDEX IF EXISTS ego.idx_incidencia_one_open_solucionada_per_user_station;
DROP INDEX IF EXISTS ego.idx_incidencia_one_open_operatiu_per_user_station;
DROP INDEX IF EXISTS ego.idx_incidencia_one_open_non_operatiu_per_user_station;

ALTER TABLE ego.incidencia DROP COLUMN IF EXISTS report_solucionada;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY conductor, estacio, (tipus = 'Operatiu')
      ORDER BY data_inici ASC, id ASC
    ) AS rn
  FROM ego.incidencia
  WHERE resolta = FALSE
    AND rebutjada = FALSE
)
UPDATE ego.incidencia i
SET
  rebutjada = TRUE,
  data_rebuig = NOW(),
  motiu_rebuig = 'Duplicat: incidència oberta anterior per la mateixa estació'
FROM ranked r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidencia_one_open_operatiu_per_user_station
  ON ego.incidencia (conductor, estacio)
  WHERE resolta = FALSE AND rebutjada = FALSE AND tipus = 'Operatiu';

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidencia_one_open_non_operatiu_per_user_station
  ON ego.incidencia (conductor, estacio)
  WHERE resolta = FALSE AND rebutjada = FALSE AND tipus <> 'Operatiu';
