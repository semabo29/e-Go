CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.resenyes (
    id SERIAL PRIMARY KEY,
    usuari_id INTEGER NOT NULL,
    estacio_id INTEGER NOT NULL,
    puntuacio INTEGER NOT NULL CHECK (puntuacio >= 1 AND puntuacio <= 5),
    comentari TEXT,
    data_publicacio TIMESTAMPTZ DEFAULT NOW(),
    data_actualitzacio TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT fk_usuari_resenya
    FOREIGN KEY(usuari_id)
    REFERENCES ego.usuari(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_estacio_resenya
    FOREIGN KEY(estacio_id)
    REFERENCES ego.estaciones(id)
    ON DELETE CASCADE
    );

-- Índex per accelerar la cerca de ressenyes d'una estació específica
CREATE INDEX IF NOT EXISTS idx_resenyes_estacio ON ego.resenyes(estacio_id);

-- Trigger per actualitzar la data d'actualitzacio automàticament quan s'edita
CREATE OR REPLACE FUNCTION update_resenyes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_actualitzacio = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resenyes_updated_at
    BEFORE UPDATE ON ego.resenyes
    FOR EACH ROW
    EXECUTE FUNCTION update_resenyes_updated_at();