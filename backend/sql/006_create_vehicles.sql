--Script para gestionar los vehiculos de los usuarios
--Como ejecutar: psql -U postgres -d nombre_de_tu_bd (postgres) -f 006_create_vehicles.sql
-- psql -U postgres -d postgres -f .\backend\sql\006_create_vehicles.sql desde el inicio.

CREATE TABLE IF NOT EXISTS ego.vehicles (
  usuari_id		INTEGER NOT NULL,
  nom			VARCHAR(50) NOT NULL,
  kw			DECIMAL(10, 2) NOT NULL,
  ac_dc		VARCHAR(20) NOT NULL, 
  tipus_connexio	VARCHAR(100),
  created_at		TIMESTAMPTZ DEFAULT NOW(),

    primary key (usuari_id, nom),
  --Ponemos las foreign keys para referenciar a usuarios
  --Si se borra un usuario, se eliminan sus instancias de vehiculos con el CASCADE
  CONSTRAINT fk_usuari
    FOREIGN KEY(usuari_id)
    REFERENCES ego.conductor(user_id)
    ON DELETE CASCADE
);
