-- Tabla de admins (backoffice)
-- Ajusta el schema y el nombre de tabla si tu DB usa otros valores.

CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.empresa (
    id         SERIAL PRIMARY KEY
);