-- Script per gestionar el catàleg de skins i l'inventari dels conductors
-- Assegurem que treballem sobre l'esquema ego
CREATE SCHEMA IF NOT EXISTS ego;

-- Aquí es guarden totes les skins globals de l'aplicació
CREATE TABLE IF NOT EXISTS ego.skins (
    id           SERIAL PRIMARY KEY,
    nom          VARCHAR(100) NOT NULL UNIQUE,
    descripcio   VARCHAR(255),
    arxiu_asset  VARCHAR(255) NOT NULL, -- Ruta o identificador de l'arxiu a Android (ex: 'skin_cotxe_blau')
    preu_punts   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
    );

-- TAULA DE L'INVENTARI (Quines skins té cada conductor)
CREATE TABLE IF NOT EXISTS ego.conductor_skins (
    conductor_id   INTEGER NOT NULL,
    skin_id        INTEGER NOT NULL,
    equipada       BOOLEAN NOT NULL DEFAULT FALSE, -- Per saber quina skin està utilitzant a la ruta
    data_obtencio  TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (conductor_id, skin_id),

    -- Foreign key cap al conductor
    -- Si s'elimina el conductor, s'eliminen les seves skins (CASCADE)
    CONSTRAINT fk_conductor
    FOREIGN KEY(conductor_id)
    REFERENCES ego.conductor(user_id)
    ON DELETE CASCADE,

    -- Foreign key cap al catàleg de skins
    CONSTRAINT fk_skin
    FOREIGN KEY(skin_id)
    REFERENCES ego.skins(id)
    ON DELETE CASCADE
    );

-- Índex parcial per assegurar que un conductor només té UNA skin equipada alhora.
-- Això evita inconsistències a la base de dades on un usuari tingui 2 skins actives a la vegada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_una_skin_equipada_per_conductor
    ON ego.conductor_skins (conductor_id)
    WHERE equipada = TRUE;