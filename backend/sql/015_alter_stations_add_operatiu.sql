ALTER TABLE ego.estaciones
ADD COLUMN IF NOT EXISTS operatiu BOOLEAN DEFAULT TRUE;

UPDATE ego.estaciones
SET operatiu = TRUE
WHERE operatiu IS NULL;

ALTER TABLE ego.estaciones
ALTER COLUMN operatiu SET NOT NULL;

ALTER TABLE ego.estaciones
ALTER COLUMN operatiu SET DEFAULT TRUE;
