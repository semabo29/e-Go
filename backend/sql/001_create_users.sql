-- Tabla de usuarios (login/registro con Google)
-- Ejecutar en la base de datos que uses (postgres o ego) desde pgAdmin o psql.
CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.usuari (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  username   VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Función para actualizar updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: al hacer UPDATE en usuarios, se actualiza updated_at
DROP TRIGGER IF EXISTS usuarios_updated_at ON ego.usuari;
CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON ego.usuari
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- Comentarios:
-- email:      lo devuelve Google al iniciar sesión; no lo introduce el usuario.
-- username:  lo elige el usuario al registrarse; es como aparece en la app (único).
-- created_at: fecha de creación del usuario.
-- updated_at: fecha de última modificación (se actualiza solo con el trigger).
