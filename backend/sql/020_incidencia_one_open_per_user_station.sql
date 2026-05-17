-- Màxim 1 incidència oberta amb tipus = Operatiu i 1 amb tipus <> Operatiu
-- per conductor i estació (tancada = resolta o rebutjada).

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidencia_one_open_operatiu_per_user_station
  ON ego.incidencia (conductor, estacio)
  WHERE resolta = FALSE AND rebutjada = FALSE AND tipus = 'Operatiu';

CREATE UNIQUE INDEX IF NOT EXISTS idx_incidencia_one_open_non_operatiu_per_user_station
  ON ego.incidencia (conductor, estacio)
  WHERE resolta = FALSE AND rebutjada = FALSE AND tipus <> 'Operatiu';
