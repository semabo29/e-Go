-- Tabla de admins (backoffice)
-- Ajusta el schema y el nombre de tabla si tu DB usa otros valores.

CREATE SCHEMA IF NOT EXISTS ego;

-- Bloc per comprovar i crear l'ENUM si no existeix
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'tipus_incidencia' AND n.nspname = 'ego'
    ) THEN
CREATE TYPE ego.tipus_incidencia AS ENUM (
          'Avariat',
          'Operatiu',
          'Inexistent',
          'DadesIncorrectes',
          'Altres'
        );
END IF;
END
$$;

CREATE TABLE IF NOT EXISTS ego.incidencia (
    id         SERIAL PRIMARY KEY,
    tipus      ego.tipus_incidencia NOT NULL,
    data_inici TIMESTAMPTZ NOT NULL,
    comentari  VARCHAR(255) NOT NULL,
    arxiu      VARCHAR(255) DEFAULT NULL,
    validada   BOOLEAN NOT NULL DEFAULT FALSE,
    resolta    BOOLEAN NOT NULL DEFAULT FALSE,
    conductor  INTEGER NOT NULL REFERENCES ego.conductor(user_id) ON DELETE CASCADE,
    estacio    INTEGER NOT NULL REFERENCES ego.estaciones(id) ON DELETE CASCADE
);