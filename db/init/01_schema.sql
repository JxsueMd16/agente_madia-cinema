-- ============================================
-- Extensiones necesarias
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS unaccent;   -- para matching "sin tildes"

-- ============================
-- Tabla principal: PELICULAS
-- ============================
CREATE TABLE IF NOT EXISTS peliculas (
  id              SERIAL PRIMARY KEY,
  titulo          TEXT NOT NULL,
  titulo_original TEXT,
  anio            SMALLINT CHECK (anio BETWEEN 1888 AND 2100),
  fecha_estreno   DATE,
  duracion_min    INT CHECK (duracion_min > 0),
  -- Clasificación / rating y métricas
  clasificacion   TEXT,           -- G, PG, PG-13, R… o APT/B15 según país
  calificacion    NUMERIC(3,2),   -- promedio interno 0–10
  rating_avg      NUMERIC(3,2),   -- promedio externo 0–10 (opcional)
  votos           INT DEFAULT 0,
  -- Descripción e imagen
  descripcion     TEXT,
  poster_url      TEXT,
  backdrop_url    TEXT,
  -- Metadatos opcionales
  idioma_original TEXT,
  pais_origen     TEXT,
  presupuesto_usd BIGINT,
  ingresos_usd    BIGINT,
  creado_en       TIMESTAMP DEFAULT NOW(),
  actualizado_en  TIMESTAMP DEFAULT NOW()
);

-- updated_at automático en peliculas
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_peliculas_updated ON peliculas;
CREATE TRIGGER trg_peliculas_updated
BEFORE UPDATE ON peliculas
FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- =========================================
-- Catálogos: GENEROS y relación N:M
-- =========================================
CREATE TABLE IF NOT EXISTS generos (
  id     SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pelicula_genero (
  pelicula_id INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  genero_id   INT NOT NULL REFERENCES generos(id)   ON DELETE CASCADE,
  PRIMARY KEY (pelicula_id, genero_id)
);

-- ==================================
-- Documentos (notas / reseñas)
-- ==================================
CREATE TABLE IF NOT EXISTS documentos (
  id          SERIAL PRIMARY KEY,
  pelicula_id INT REFERENCES peliculas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  contenido   TEXT NOT NULL
);

-- ==========================================================
-- Embeddings para búsquedas semánticas (pgvector 768-D)
--  + Ingesta incremental (content_hash + embedding_model)
-- ==========================================================
CREATE TABLE IF NOT EXISTS pelicula_embeddings (
  id              SERIAL PRIMARY KEY,
  pelicula_id     INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  embedding       vector(768),     -- ajusta dimensión a tu modelo
  content_hash    TEXT,            -- sha256 del texto usado para embed
  embedding_model TEXT,            -- ej. 'text-embedding-004'
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- UNA fila por película (si quieres histórico, elimina este UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pelicula_embeddings_pelicula
  ON pelicula_embeddings (pelicula_id);

-- Búsqueda rápida por versión de contenido/modelo (opcional)
CREATE INDEX IF NOT EXISTS ix_pelicula_embeddings_hash
  ON pelicula_embeddings (content_hash, embedding_model);

-- Índice vectorial (recomendado por pgvector)
-- Nota: IVFFLAT requiere ANALYZE y elegir listas; 100–200 va bien para catálogos chicos/medios.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'ix_pelicula_embeddings_vec' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX ix_pelicula_embeddings_vec
      ON pelicula_embeddings
      USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
  END IF;
END$$;

-- Trigger updated_at en embeddings
CREATE OR REPLACE FUNCTION set_pel_emb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pel_emb_updated ON pelicula_embeddings;
CREATE TRIGGER trg_pel_emb_updated
BEFORE UPDATE ON pelicula_embeddings
FOR EACH ROW EXECUTE FUNCTION set_pel_emb_updated_at();

-- Embeddings de documentos (opcional)
CREATE TABLE IF NOT EXISTS doc_embeddings (
  id           SERIAL PRIMARY KEY,
  documento_id INT NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  embedding    vector(768)
);

-- ==================================
-- Vistas de conveniencia
-- ==================================
-- Vista de catálogo (lo más usado por la API/UI)
CREATE OR REPLACE VIEW v_peliculas AS
SELECT
  p.id, p.titulo, p.titulo_original, p.anio, p.fecha_estreno,
  p.duracion_min, p.clasificacion, p.calificacion, p.rating_avg, p.votos,
  p.descripcion, p.poster_url, p.backdrop_url,
  p.idioma_original, p.pais_origen, p.presupuesto_usd, p.ingresos_usd,
  p.creado_en, p.actualizado_en,
  COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
FROM peliculas p
LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
LEFT JOIN generos g ON g.id = pg.genero_id
GROUP BY p.id;

-- Vista simple de documentos por película
CREATE OR REPLACE VIEW v_documentos AS
SELECT d.id, d.pelicula_id, p.titulo AS pelicula, d.titulo, d.contenido
FROM documentos d
LEFT JOIN peliculas p ON p.id = d.pelicula_id;

