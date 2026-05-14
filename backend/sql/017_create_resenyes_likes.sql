CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.resenyes_likes (
    resenya_id INTEGER NOT NULL REFERENCES ego.resenyes(id) ON DELETE CASCADE,
    usuari_id INTEGER NOT NULL REFERENCES ego.usuari(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Això assegura que un usuari només pot donar UN like per ressenya
    PRIMARY KEY (resenya_id, usuari_id)
);