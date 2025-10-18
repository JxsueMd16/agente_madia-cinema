// services/api/src/repositories/peliculasRepository.js
import { pool } from '../config/database.js';
/**
 * Obtiene todas las películas desde la vista
 */
export async function getAllPeliculas() {
  const query = 'SELECT * FROM v_peliculas ORDER BY id ASC';
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Busca películas por género
 */
export async function findByGenero(generos) {
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.pais_origen, p.idioma_original,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
    FROM peliculas p
    JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    JOIN generos g ON g.id = pg.genero_id
    WHERE g.nombre = ANY($1::text[])
    GROUP BY p.id
    ORDER BY p.calificacion DESC
    LIMIT 10
  `;
  
  const result = await pool.query(sql, [generos]);
  return result.rows;
}

/**
 * Busca películas por año o rango
 */
export async function findByAnio(anioInicio, anioFin) {
  const fin = anioFin || anioInicio;
  
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.pais_origen,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
    FROM peliculas p
    LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    LEFT JOIN generos g ON g.id = pg.genero_id
    WHERE p.anio BETWEEN $1 AND $2
    GROUP BY p.id
    ORDER BY p.anio DESC, p.calificacion DESC
  `;
  
  const result = await pool.query(sql, [anioInicio, fin]);
  return result.rows;
}

/**
 * Busca películas por calificación mínima
 */
export async function findByCalificacion(calificacionMin) {
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.pais_origen,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
    FROM peliculas p
    LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    LEFT JOIN generos g ON g.id = pg.genero_id
    WHERE p.calificacion >= $1
    GROUP BY p.id
    ORDER BY p.calificacion DESC
    LIMIT 20
  `;
  
  const result = await pool.query(sql, [calificacionMin]);
  return result.rows;
}

/**
 * Busca películas por país
 */
export async function findByPais(pais) {
  const paisNormalizado = pais.toUpperCase();
  
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.pais_origen, p.idioma_original,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
    FROM peliculas p
    LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    LEFT JOIN generos g ON g.id = pg.genero_id
    WHERE UPPER(p.pais_origen) LIKE $1 OR UPPER(p.pais_origen) = $2
    GROUP BY p.id
    ORDER BY p.anio DESC
  `;
  
  const result = await pool.query(sql, [`%${paisNormalizado}%`, paisNormalizado]);
  return result.rows;
}

/**
 * Cuenta películas con filtros opcionales
 */
export async function contarPeliculas(genero = null, pais = null) {
  let sql = 'SELECT COUNT(DISTINCT p.id) as total FROM peliculas p';
  
  const conditions = [];
  const params = [];
  let paramCount = 1;
  
  if (genero) {
    sql += ` JOIN pelicula_genero pg ON pg.pelicula_id = p.id
             JOIN generos g ON g.id = pg.genero_id`;
    conditions.push(`g.nombre = $${paramCount}`);
    params.push(genero);
    paramCount++;
  }
  
  if (pais) {
    conditions.push(`UPPER(p.pais_origen) LIKE $${paramCount}`);
    params.push(`%${pais.toUpperCase()}%`);
    paramCount++;
  }
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  const result = await pool.query(sql, params);
  return { 
    total: parseInt(result.rows[0].total),
    filtros: { genero, pais }
  };
}

/**
 * Obtiene estadísticas generales
 */
export async function getEstadisticas() {
  const statsSQL = `
    SELECT 
      COUNT(*) as total_peliculas,
      ROUND(AVG(calificacion), 2) as calificacion_promedio,
      ROUND(AVG(duracion_min), 0) as duracion_promedio,
      MIN(anio) as anio_mas_antiguo,
      MAX(anio) as anio_mas_reciente,
      COUNT(DISTINCT pais_origen) as total_paises
    FROM peliculas
  `;
  
  const generosSQL = `
    SELECT g.nombre, COUNT(pg.pelicula_id) as cantidad
    FROM generos g
    LEFT JOIN pelicula_genero pg ON pg.genero_id = g.id
    GROUP BY g.nombre
    ORDER BY cantidad DESC
  `;
  
  const topSQL = `
    SELECT titulo, calificacion, anio, pais_origen
    FROM peliculas
    ORDER BY calificacion DESC
    LIMIT 3
  `;
  
  const [stats, generos, top] = await Promise.all([
    pool.query(statsSQL),
    pool.query(generosSQL),
    pool.query(topSQL)
  ]);
  
  return {
    estadisticas_generales: stats.rows[0],
    distribucion_generos: generos.rows,
    top_3_peliculas: top.rows
  };
}

/**
 * Compara múltiples películas
 */
export async function compararPeliculas(titulos) {
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.pais_origen, p.idioma_original,
      p.presupuesto_usd, p.ingresos_usd,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
    FROM peliculas p
    LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    LEFT JOIN generos g ON g.id = pg.genero_id
    WHERE p.titulo = ANY($1::text[])
    GROUP BY p.id
    ORDER BY p.calificacion DESC
  `;
  
  const result = await pool.query(sql, [titulos]);
  
  if (result.rows.length === 0) {
    return { error: "No se encontraron las películas especificadas" };
  }
  
  return {
    peliculas_comparadas: result.rows,
    total_encontradas: result.rows.length,
    total_solicitadas: titulos.length
  };
}

/**
 * Búsqueda semántica de películas usando embeddings
 */
export async function semanticSearch(vectorStr, limit = 5) {
  const sql = `
    SELECT 
      p.id, p.titulo, p.titulo_original, p.anio, p.duracion_min,
      p.clasificacion, p.calificacion, p.rating_avg, p.votos,
      p.descripcion, p.idioma_original, p.pais_origen,
      COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos,
      1 - (e.embedding <-> $1::vector) AS similarity
    FROM pelicula_embeddings e
    JOIN peliculas p ON p.id = e.pelicula_id
    LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
    LEFT JOIN generos g ON g.id = pg.genero_id
    GROUP BY p.id, e.embedding
    ORDER BY e.embedding <-> $1::vector
    LIMIT $2
  `;
  
  const result = await pool.query(sql, [vectorStr, limit]);
  return result.rows;
}

export async function getPeliculaById(id) {
  const query = 'SELECT * FROM v_peliculas WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];  // Solo devolver una película
}
